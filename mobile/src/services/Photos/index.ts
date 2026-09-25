import * as RNFS from '@dr.pogodin/react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import api, { API_BASE_URL, getDeviceIdentity } from '../api';
import { normalizeApiError } from '../apiError';
import {
  getLocalPhotoById,
  listLocalPhotoRecords,
  publishLocalPhotoInventoryChanged,
  savePhotoToAppStorage,
  upsertLocalPhotoRecord,
  type StoredPhoto,
} from '../../localStorage';
import { useAuthStore } from '../../store/auth.store';
import { executeSyncSql } from '../../sync/sqlite/database';
import { initializeOfflineSyncFoundation } from '../../sync';
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
  notePreview?: string | null;
  replication?: number | null;
  treatment?: number | null;
  replicationName?: string | null;
  treatmentName?: string | null;
}

type PhotoSource = StoredPhoto | CloudPhoto;

const ORIGINAL_STANDARD_LIMIT = 500 * 1024;
const PHOTO_LIBRARY_SYNC_KEY = 'photo_library_last_sync_at';
const PHOTO_LIBRARY_CACHE_TTL_MS = 15 * 60 * 1000;
const STANDARD_SETTINGS = { width: 1920, height: 1920, quality: 82 };
const THUMBNAIL_SETTINGS = { width: 360, height: 360, quality: 72 };
const safeCacheKey = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');
const cachePath = (photoId: string, variant: PhotoVariant) =>
  `${RNFS.CachesDirectoryPath}/research-pal-${safeCacheKey(`${photoId}-${variant}`)}.photo`;
const syncDownloadPath = (photoId: string, variant: PhotoVariant = 'standard') =>
  `${RNFS.CachesDirectoryPath}/research-pal-sync-${safeCacheKey(`${photoId}-${variant}`)}.photo`;
const absoluteApiUrl = (path: string) => `${API_BASE_URL.replace(/\/$/, '')}${path}`;

const isCloudPhoto = (photo: PhotoSource): photo is CloudPhoto =>
  typeof (photo as CloudPhoto).photoId === 'string';

const cloudFromSource = (photo: PhotoSource): CloudPhoto | null =>
  isCloudPhoto(photo)
    ? photo
    : (photo.cloudPhoto as CloudPhoto | undefined) || null;

const photoIdFromSource = (photo: PhotoSource) =>
  isCloudPhoto(photo) ? photo.photoId : photo.id;

const logPhotoCache = (message: string, details?: Record<string, unknown>) => {
  if (__DEV__) console.log(`[PhotoCache] ${message}`, details || '');
};

const logPhotoResolution = (
  photoId: string,
  source: 'permanent-local' | 'cached-cloud' | 'cloud-download-required',
  details?: Record<string, unknown>,
) => {
  if (__DEV__) console.log(`[PhotoResolver] ${photoId} -> ${source}`, details || '');
};

export const getPhotoLibrary = async (): Promise<CloudPhoto[]> => {
  const response = await api.get('/photos/library');
  return response.data?.photos || [];
};

const getPhotoLibraryLastSyncAt = async () => {
  await initializeOfflineSyncFoundation();
  const result = await executeSyncSql(
    'SELECT value FROM sync_state WHERE key = ? LIMIT 1',
    [PHOTO_LIBRARY_SYNC_KEY],
  );
  if (!result.rows.length) return null;
  const rawValue = (result.rows.item(0) as { value?: string | null }).value;
  const parsed = rawValue ? Number(rawValue) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

const setPhotoLibraryLastSyncAt = async (timestamp: number) => {
  await initializeOfflineSyncFoundation();
  await executeSyncSql(
    `INSERT INTO sync_state (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [PHOTO_LIBRARY_SYNC_KEY, String(timestamp)],
  );
};

const sortStoredPhotos = (photos: StoredPhoto[]) =>
  [...photos].sort(
    (first, second) => new Date(second.date).getTime() - new Date(first.date).getTime(),
  );

const mergeCloudPhotosIntoLocal = async (
  localRecords: StoredPhoto[],
  cloudPhotos: CloudPhoto[],
) => {
  const byId = new Map<string, StoredPhoto>();

  for (const local of localRecords) {
    byId.set(local.id, local);
  }

  for (const cloudPhoto of cloudPhotos) {
    const existing = byId.get(cloudPhoto.photoId);
    const merged: StoredPhoto = {
      id: cloudPhoto.photoId,
      name: existing?.name || `${cloudPhoto.photoId}.jpg`,
      location: existing?.location || '',
      mimeType: existing?.mimeType || cloudPhoto.variants.standard?.mimeType || cloudPhoto.variants.original?.mimeType || 'image/jpeg',
      date: existing?.date || cloudPhoto.capturedAt,
      projectId: existing?.projectId || cloudPhoto.projectId,
      plotId: existing?.plotId || cloudPhoto.plotId,
      noteId: existing?.noteId ?? cloudPhoto.noteId,
      cloudPhoto,
      uploadStatus: existing?.uploadStatus || 'uploaded',
    };
    await upsertLocalPhotoRecord(merged);
    byId.set(cloudPhoto.photoId, merged);
  }

  return sortStoredPhotos(Array.from(byId.values()));
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
      timeout: 120000,
      onUploadProgress: progress => {
        if (progress.total) onProgress?.(Math.round((progress.loaded / progress.total) * 100));
      },
    });
    const cloudPhoto = response.data.photo as CloudPhoto;
    await upsertLocalPhotoRecord({
      ...photo,
      projectId: relationship.projectId,
      plotId: relationship.plotId,
      noteId: relationship.noteId || null,
      cloudPhoto,
      uploadStatus: 'uploaded',
    });
    return cloudPhoto;
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
  if (existing) {
    await upsertLocalPhotoRecord({
      ...existing,
      projectId: existing.projectId || photo.projectId,
      plotId: existing.plotId || photo.plotId,
      noteId: existing.noteId ?? photo.noteId,
      cloudPhoto: photo,
      uploadStatus: existing.uploadStatus || 'uploaded',
    });
    return existing;
  }

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
  await upsertLocalPhotoRecord({
    ...stored,
    projectId: photo.projectId,
    plotId: photo.plotId,
    noteId: photo.noteId,
    cloudPhoto: photo,
    uploadStatus: 'downloaded',
  });

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

export const getCachedPhotoLibrary = async (): Promise<StoredPhoto[]> => {
  const localRecords = await listLocalPhotoRecords().catch(error => {
    if (__DEV__) console.error('[PhotoCache] unable to load local records', error);
    return [];
  });
  logPhotoCache(`local records loaded: ${localRecords.length}`);
  return sortStoredPhotos(localRecords);
};

export const getMergedPhotoLibrary = async (
  options: { forceRemote?: boolean; allowRemote?: boolean } = {},
): Promise<StoredPhoto[]> => {
  const localRecords = await getCachedPhotoLibrary();
  const lastSyncAt = await getPhotoLibraryLastSyncAt().catch(error => {
    if (__DEV__) console.error('[PhotoCache] unable to read cache timestamp', error);
    return null;
  });
  const now = Date.now();
  const cacheAge = lastSyncAt ? now - lastSyncAt : null;
  logPhotoCache(`cache age: ${cacheAge === null ? 'never' : cacheAge}`);

  if (options.allowRemote === false) {
    logPhotoCache('cache valid - skipping remote fetch', {
      reason: 'remote-disabled',
      localCount: localRecords.length,
    });
    return localRecords;
  }

  const cacheValid = Boolean(
    lastSyncAt &&
      cacheAge !== null &&
      cacheAge < PHOTO_LIBRARY_CACHE_TTL_MS,
  );

  if (!options.forceRemote && cacheValid) {
    logPhotoCache('cache valid - skipping remote fetch', {
      localCount: localRecords.length,
      cacheAge,
      ttl: PHOTO_LIBRARY_CACHE_TTL_MS,
    });
    return localRecords;
  }

  logPhotoCache(
    localRecords.length ? 'cache stale - background sync' : 'no local cache - remote sync',
    { localCount: localRecords.length, cacheAge, forced: Boolean(options.forceRemote) },
  );

  try {
    const cloud = await getPhotoLibrary();
    const merged = await mergeCloudPhotosIntoLocal(localRecords, cloud);
    await setPhotoLibraryLastSyncAt(now);
    logPhotoCache('remote records merged', {
      remoteCount: cloud.length,
      mergedCount: merged.length,
    });
    return merged;
  } catch (error) {
    if (__DEV__) console.error('[PhotoCache] remote sync failed', error);
    if (localRecords.length) return localRecords;
    throw error;
  }
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

export const resolvePhotoFile = (photo: PhotoSource, variant: PhotoVariant = 'standard') =>
  (async () => {
    const photoId = photoIdFromSource(photo);
    const localPhoto = await getLocalPhotoById(photoId);
    if (localPhoto?.location && await RNFS.exists(localPhoto.location)) {
      logPhotoResolution(photoId, 'permanent-local', {
        storedLocalUri: localPhoto.location,
        localExists: true,
        projectId: localPhoto.projectId,
        plotId: localPhoto.plotId,
        noteId: localPhoto.noteId,
      });
      return localPhoto.location;
    }

    const cloudPhoto = cloudFromSource(photo);
    if (!cloudPhoto) {
      if (__DEV__) console.log(`[PhotoResolver] ${photoId} -> missing-local-no-cloud`);
      throw new Error('Photo is not available on this device.');
    }

    if (variant === 'standard' || variant === 'original') {
      logPhotoResolution(photoId, 'cloud-download-required', {
        variant,
        projectId: cloudPhoto.projectId,
        plotId: cloudPhoto.plotId,
        noteId: cloudPhoto.noteId,
      });
      const synced = await syncCloudPhotoToLocal(cloudPhoto, { overrideRestrictions: true, saveToDeviceLibrary: false });
      if (synced) return synced.location;
    }

    const path = cachePath(photoId, variant);
    if (await RNFS.exists(path)) {
      logPhotoResolution(photoId, 'cached-cloud', {
        variant,
        cachePath: path,
      });
      return path;
    }
    logPhotoResolution(photoId, 'cloud-download-required', {
      variant,
      cloudId: cloudPhoto.variants[variant]?.storageId,
      projectId: cloudPhoto.projectId,
      plotId: cloudPhoto.plotId,
      noteId: cloudPhoto.noteId,
    });
    return downloadPhotoVariant(cloudPhoto, variant, path);
  })();

export const resolveCloudPhotoFile = (photo: CloudPhoto, variant: PhotoVariant = 'standard') =>
  resolvePhotoFile(photo, variant);

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
