import * as RNFS from '@dr.pogodin/react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import api, { API_BASE_URL, getDeviceIdentity } from '../api';
import { normalizeApiError } from '../apiError';
import {
  getLocalPhotoById,
  publishLocalPhotoInventoryChanged,
  savePhotoToAppStorage,
  type StoredPhoto,
} from '../../localStorage';
import { useAuthStore } from '../../store/auth.store';
import { saveToPhotos } from '../deviceStorage';
import { conditionsAllowUpload, schedulePhotoUploadWork } from '../photoUploadScheduler';

type PhotoVariant = 'original' | 'standard' | 'thumbnail';
type VariantPayload = {
  storageId: string;
  url: string;
  mimeType: string;
};

export interface CloudPhoto {
  photoId: string;
  projectId: string;
  plotId: string;
  noteId: string | null;
  variants: Record<PhotoVariant, VariantPayload>;
  capturedAt: string;
  projectTitle?: string | null;
  plotTitle?: string | null;
}

const ORIGINAL_STANDARD_LIMIT = 500 * 1024;
const STANDARD_SETTINGS = { width: 1920, height: 1920, quality: 82 };
const THUMBNAIL_SETTINGS = { width: 360, height: 360, quality: 72 };
const safeCacheKey = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');
const cachePath = (photoId: string, variant: PhotoVariant) =>
  `${RNFS.CachesDirectoryPath}/research-pal-${safeCacheKey(`${photoId}-${variant}`)}.photo`;
const syncDownloadPath = (photoId: string, variant: PhotoVariant = 'standard') =>
  `${RNFS.CachesDirectoryPath}/research-pal-sync-${safeCacheKey(`${photoId}-${variant}`)}.photo`;
const absoluteApiUrl = (path: string) => `${API_BASE_URL.replace(/\/$/, '')}${path}`;

export const getPhotoLibrary = async (): Promise<CloudPhoto[]> => {
  const response = await api.get('/photos/library');
  return response.data?.photos || [];
};

const originalMimeType = (photo: StoredPhoto) => photo.mimeType || 'image/jpeg';

const createJpegVariant = async (
  sourcePath: string,
  settings: { width: number; height: number; quality: number },
) => ImageResizer.createResizedImage(
  `file://${sourcePath}`,
  settings.width,
  settings.height,
  'JPEG',
  settings.quality,
  0,
  undefined,
  false,
  { mode: 'contain', onlyScaleDown: true },
);

export const uploadPhoto = async (
  photo: StoredPhoto,
  relationship: { projectId: string; plotId: string; noteId?: string },
  onProgress?: (percentage: number) => void,
): Promise<CloudPhoto> => {
  if (photo.remoteUrl) {
    const existing = (await getPhotoLibrary()).find(item => item.photoId === photo.id);
    if (!existing) throw new Error('This photo is no longer available.');
    return existing;
  }
  const originalStat = await RNFS.stat(photo.location);
  const originalSize = Number(originalStat.size || 0);
  const standardSource = originalSize <= ORIGINAL_STANDARD_LIMIT
    ? null
    : await createJpegVariant(photo.location, STANDARD_SETTINGS);
  const thumbnailSource = await createJpegVariant(photo.location, THUMBNAIL_SETTINGS);

  try {
    const form = new FormData();
    form.append('projectId', relationship.projectId);
    form.append('plotId', relationship.plotId);
    form.append('photoId', photo.id);
    form.append('idempotencyKey', photo.id);
    if (relationship.noteId) form.append('noteId', relationship.noteId);
    form.append('capturedAt', photo.date);
    form.append('original', { uri: `file://${photo.location}`, name: photo.name || `${photo.id}.jpg`, type: originalMimeType(photo) } as any);
    if (standardSource) form.append('standard', { uri: standardSource.uri, name: `${photo.id}-standard.jpg`, type: 'image/jpeg' } as any);
    form.append('thumbnail', { uri: thumbnailSource.uri, name: `${photo.id}-thumbnail.jpg`, type: 'image/jpeg' } as any);
    const response = await api.post('/photos/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: progress => {
        if (progress.total) onProgress?.(Math.round((progress.loaded / progress.total) * 100));
      },
    });
    return response.data.photo;
  } finally {
    await Promise.all([
      standardSource ? RNFS.unlink(standardSource.path).catch(() => undefined) : Promise.resolve(),
      RNFS.unlink(thumbnailSource.path).catch(() => undefined),
    ]);
  }
};

export const deletePhoto = async (photoId: string) => {
  await api.delete(`/photos/${encodeURIComponent(photoId)}`);
};

async function downloadPhotoVariant(photo: CloudPhoto, variant: PhotoVariant, path: string) {
  const token = useAuthStore.getState().getUser()?.token;
  const device = await getDeviceIdentity();
  const result = await RNFS.downloadFile({
    fromUrl: absoluteApiUrl(photo.variants[variant].url),
    toFile: path,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Client-Type': 'mobile',
      'X-Device-Id': device.id,
      'X-Device-Model': device.model,
      'X-Device-Platform': device.platform,
      'X-Device-Os-Version': device.osVersion,
    },
  }).promise;
  if (result.statusCode < 200 || result.statusCode >= 300) {
    await RNFS.unlink(path).catch(() => undefined);
    throw new Error('Unable to download photo.');
  }
  return path;
}

export const syncCloudPhotoToLocal = async (
  photo: CloudPhoto,
  options: { overrideRestrictions?: boolean; saveToDeviceLibrary?: boolean } = {},
): Promise<StoredPhoto | null> => {
  const existing = await getLocalPhotoById(photo.photoId);
  if (existing) return existing;

  if (!await conditionsAllowUpload(Boolean(options.overrideRestrictions))) {
    await schedulePhotoUploadWork();
    return null;
  }

  const variant: PhotoVariant = photo.variants.standard ? 'standard' : 'original';
  const tempPath = syncDownloadPath(photo.photoId, variant);
  if (await RNFS.exists(tempPath)) await RNFS.unlink(tempPath).catch(() => undefined);
  await downloadPhotoVariant(photo, variant, tempPath);

  const mimeType = photo.variants[variant].mimeType || 'image/jpeg';
  const stored = await savePhotoToAppStorage(
    `file://${tempPath}`,
    `${photo.photoId}.jpg`,
    mimeType,
    photo.photoId,
    photo.capturedAt,
  );

  if (options.saveToDeviceLibrary !== false) {
    const base64 = await RNFS.readFile(stored.location, 'base64');
    await saveToPhotos(stored.name, mimeType, base64).catch(error => {
      if (__DEV__) console.error('Unable to save synced photo to device Photos', error);
    });
  }

  await RNFS.unlink(tempPath).catch(() => undefined);
  publishLocalPhotoInventoryChanged();
  return stored;
};

export const syncMissingCloudPhotos = async (
  photos: CloudPhoto[],
  options: { overrideRestrictions?: boolean; saveToDeviceLibrary?: boolean } = {},
) => {
  const synced: StoredPhoto[] = [];
  if (!await conditionsAllowUpload(Boolean(options.overrideRestrictions))) {
    await schedulePhotoUploadWork();
    return synced;
  }
  for (const photo of photos) {
    const local = await syncCloudPhotoToLocal(photo, options).catch(error => {
      if (__DEV__) console.error('Unable to sync cloud photo locally', photo.photoId, error);
      return null;
    });
    if (local) synced.push(local);
  }
  return synced;
};

export const resolveCloudPhotoFile = (photo: CloudPhoto, variant: PhotoVariant = 'standard') =>
  (async () => {
    const localPhoto = await getLocalPhotoById(photo.photoId);
    if (localPhoto) return localPhoto.location;
    if (variant === 'standard' || variant === 'original') {
      const synced = await syncCloudPhotoToLocal(photo, { overrideRestrictions: true });
      if (synced) return synced.location;
    }
    const path = cachePath(photo.photoId, variant);
    if (await RNFS.exists(path)) return path;
    return downloadPhotoVariant(photo, variant, path);
  })();

export const getAllPhotoIds = async (_userId: string) => {
  try {
    const photos = await getPhotoLibrary();
    return { status: 200, data: { allPhotoIds: photos.map(photo => photo.photoId), photos } };
  } catch (error) {
    const parsed = normalizeApiError(error);
    return { status: parsed.status || 500, message: parsed.message };
  }
};

export const getPhotoDetails = async (photoId: string, _userId: string) => {
  try {
    const res = await api.get('/photos/', { params: { photoId } });
    return { status: res.status, data: res.data?.data || res.data };
  } catch (error) {
    const parsed = normalizeApiError(error);
    return { status: parsed.status || 500, message: parsed.message };
  }
};
