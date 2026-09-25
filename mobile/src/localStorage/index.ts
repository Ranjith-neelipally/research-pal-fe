import { useCallback } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { executeSyncSql } from '../sync/sqlite/database';
import { initializeOfflineSyncFoundation } from '../sync';
import { getDeviceStorageInfo } from '../services/deviceStorage';

export interface StoredPhoto {
  id: string;
  name: string;
  location: string;
  date: string;
  mimeType?: string;
  remoteUrl?: string;
  standardLocation?: string;
  cloudPhoto?: unknown;
  projectId?: string;
  plotId?: string;
  noteId?: string | null;
  uploadStatus?: string;
}

const APP_PHOTO_DIR = `${RNFS.DocumentDirectoryPath}/photos`;
const PHOTO_PICKER_OPTIONS = { mediaType: 'photo' as const };
const CAMERA_OPTIONS = { ...PHOTO_PICKER_OPTIONS, saveToPhotos: true };
const photoInventoryListeners = new Set<() => void | Promise<void>>();

export const subscribeLocalPhotoInventoryChanges = (listener: () => void | Promise<void>) => {
  photoInventoryListeners.add(listener);
  return () => {
    photoInventoryListeners.delete(listener);
  };
};

const notifyLocalPhotoInventoryChanged = () => {
  photoInventoryListeners.forEach(listener => {
    void Promise.resolve(listener()).catch(error => {
      if (__DEV__) console.error('Unable to publish photo inventory change', error);
    });
  });
};

export const getAttachedPhotoStorageStats = async () => {
  const directoryExists = await RNFS.exists(APP_PHOTO_DIR);
  const storedFiles = directoryExists
    ? (await RNFS.readDir(APP_PHOTO_DIR)).filter(entry => entry.isFile())
    : [];
  let usedBytes = 0;
  for (const file of storedFiles) {
    const stat = await RNFS.stat(file.path);
    usedBytes += Number(stat.size || 0);
  }

  let allowanceBytes: number | null = null;
  try {
    const { totalBytes } = await getDeviceStorageInfo();
    allowanceBytes = totalBytes * 0.2;
  } catch (error) {
    if (__DEV__) console.error('Unable to read device storage', error);
  }
  return { photoCount: storedFiles.length, usedBytes, allowanceBytes };
};

const ensurePhotoDir = async (): Promise<void> => {
  const exists = await RNFS.exists(APP_PHOTO_DIR);
  if (!exists) {
    await RNFS.mkdir(APP_PHOTO_DIR);
  }
};

const debugPhoto = (message: string, details: Record<string, unknown>) => {
  if (__DEV__) console.log(`[photos/local] ${message}`, details);
};

const normalizePhotoPath = (uri: string) => uri.replace('file://', '');

const ensurePhotoMetadataReady = async () => {
  await initializeOfflineSyncFoundation();
};

const parseCloudPhoto = (value: unknown) => {
  if (!value) return undefined;
  try {
    return JSON.parse(String(value));
  } catch (error) {
    if (__DEV__) console.error('[photos/local] unable to parse cloud metadata', error);
    return undefined;
  }
};

const rowToStoredPhoto = (row: Record<string, unknown>): StoredPhoto => ({
  id: String(row.photo_id),
  name: row.original_name ? String(row.original_name) : `${String(row.photo_id)}.jpg`,
  location: row.local_path ? String(row.local_path) : '',
  date: String(row.captured_at || row.created_at || new Date().toISOString()),
  mimeType: row.mime_type ? String(row.mime_type) : 'image/jpeg',
  cloudPhoto: parseCloudPhoto(row.cloud_json),
  projectId: row.project_id ? String(row.project_id) : undefined,
  plotId: row.plot_id ? String(row.plot_id) : undefined,
  noteId: row.note_id ? String(row.note_id) : null,
  uploadStatus: row.upload_status ? String(row.upload_status) : undefined,
});

export const upsertLocalPhotoRecord = async (photo: StoredPhoto) => {
  await ensurePhotoMetadataReady();
  const now = new Date().toISOString();
  await executeSyncSql(
    `INSERT INTO local_photos (
      photo_id, local_path, original_name, mime_type, project_id, plot_id, note_id,
      cloud_json, upload_status, captured_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(photo_id) DO UPDATE SET
      local_path = COALESCE(excluded.local_path, local_photos.local_path),
      original_name = COALESCE(excluded.original_name, local_photos.original_name),
      mime_type = COALESCE(excluded.mime_type, local_photos.mime_type),
      project_id = COALESCE(excluded.project_id, local_photos.project_id),
      plot_id = COALESCE(excluded.plot_id, local_photos.plot_id),
      note_id = COALESCE(excluded.note_id, local_photos.note_id),
      cloud_json = COALESCE(excluded.cloud_json, local_photos.cloud_json),
      upload_status = COALESCE(excluded.upload_status, local_photos.upload_status),
      captured_at = COALESCE(excluded.captured_at, local_photos.captured_at),
      updated_at = excluded.updated_at;`,
    [
      photo.id,
      photo.location || null,
      photo.name || null,
      photo.mimeType || 'image/jpeg',
      photo.projectId || null,
      photo.plotId || null,
      photo.noteId || null,
      photo.cloudPhoto ? JSON.stringify(photo.cloudPhoto) : null,
      photo.uploadStatus || null,
      photo.date || now,
      now,
      now,
    ],
  );
  debugPhoto('record upserted', {
    photoId: photo.id,
    storedLocalUri: photo.location,
    projectId: photo.projectId,
    plotId: photo.plotId,
    noteId: photo.noteId,
    uploadState: photo.uploadStatus,
  });
};

export const listLocalPhotoRecords = async (): Promise<StoredPhoto[]> => {
  await ensurePhotoMetadataReady();
  const result = await executeSyncSql(
    `SELECT * FROM local_photos ORDER BY captured_at DESC, created_at DESC;`,
  );
  const records: StoredPhoto[] = [];
  for (let index = 0; index < result.rows.length; index += 1) {
    records.push(rowToStoredPhoto(result.rows.item(index) as Record<string, unknown>));
  }
  return records;
};

export const updateLocalPhotoUploadStatus = async (photoId: string, status: string) => {
  await ensurePhotoMetadataReady();
  await executeSyncSql(
    `UPDATE local_photos SET upload_status = ?, updated_at = ? WHERE photo_id = ?;`,
    [status, new Date().toISOString(), photoId],
  );
  debugPhoto('upload status updated', { photoId, uploadState: status });
};

const compressToCanonicalPhoto = async (uri: string) =>
  ImageResizer.createResizedImage(
    uri.startsWith('file://') ? uri : `file://${uri}`,
    1920,
    1920,
    'JPEG',
    82,
    0,
    undefined,
    false,
    { mode: 'contain', onlyScaleDown: true },
  );

export const savePhotoToAppStorage = async (
  uri: string,
  originalName?: string,
  mimeType?: string,
  preferredId?: string,
  capturedAt?: string,
): Promise<StoredPhoto> => {
  await ensurePhotoDir();

  const id = preferredId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `${id}.jpg`;
  const destPath = `${APP_PHOTO_DIR}/${name}`;

  if (await RNFS.exists(destPath)) {
    const stat = await RNFS.stat(destPath);
    const stored = {
      id,
      name,
      location: destPath,
      date: capturedAt || (stat.mtime ? new Date(stat.mtime).toISOString() : new Date().toISOString()),
      mimeType: mimeType || 'image/jpeg',
    };
    await upsertLocalPhotoRecord(stored);
    return stored;
  }

  await RNFS.copyFile(normalizePhotoPath(uri), destPath);

  const stored = {
    id,
    name,
    location: destPath,
    date: capturedAt || new Date().toISOString(),
    mimeType: mimeType || 'image/jpeg',
  };
  await upsertLocalPhotoRecord(stored);
  return stored;
};

const copyPhotoToAppStorage = async (uri: string, originalName?: string): Promise<StoredPhoto> => {
  let compressed: Awaited<ReturnType<typeof compressToCanonicalPhoto>> | null = null;
  try {
    compressed = await compressToCanonicalPhoto(uri);
    return await savePhotoToAppStorage(compressed.uri, originalName || compressed.name, 'image/jpeg');
  } finally {
    if (compressed?.path) await RNFS.unlink(compressed.path).catch(() => undefined);
  }
};

export const getLocalPhotoById = async (id: string): Promise<StoredPhoto | null> => {
  await ensurePhotoDir();
  await ensurePhotoMetadataReady();
  const existingRecord = await executeSyncSql(
    `SELECT * FROM local_photos WHERE photo_id = ? LIMIT 1;`,
    [id],
  );
  if (existingRecord.rows.length) {
    const record = rowToStoredPhoto(existingRecord.rows.item(0) as Record<string, unknown>);
    const exists = Boolean(record.location && await RNFS.exists(record.location));
    debugPhoto('record lookup', {
      photoId: id,
      storedLocalUri: record.location,
      localExists: exists,
      cloudId: record.cloudPhoto ? 'present' : null,
      uploadState: record.uploadStatus,
      projectId: record.projectId,
      plotId: record.plotId,
      noteId: record.noteId,
    });
    if (exists) return record;
  }
  const files = await RNFS.readDir(APP_PHOTO_DIR);
  const file = files.find(entry => entry.isFile() && entry.name.startsWith(`${id}.`));
  if (!file) return null;

  const stat = await RNFS.stat(file.path);

  const migrated = {
    id,
    name: file.name,
    location: file.path,
    date: stat.mtime
      ? new Date(stat.mtime).toISOString()
      : new Date().toISOString(),
    mimeType: 'image/jpeg',
  };
  await upsertLocalPhotoRecord(migrated);
  debugPhoto('legacy file migrated', { photoId: id, storedLocalUri: file.path });
  return migrated;
};

export const cleanupProjectLocalData = async (
  projectId: string,
): Promise<void> => {
  const notes = await executeSyncSql(
    'SELECT id, photo_ids_json FROM notes WHERE project_id = ?',
    [projectId],
  );
  const photoIds = new Set<string>();

  for (let index = 0; index < notes.rows.length; index += 1) {
    const row = notes.rows.item(index) as {
      id: string;
      photo_ids_json?: string | null;
    };
    try {
      const ids = JSON.parse(row.photo_ids_json || '[]');
      if (Array.isArray(ids)) {
        ids.forEach(id => typeof id === 'string' && photoIds.add(id));
      }
    } catch {
      // A malformed legacy photo list must not prevent the remaining cleanup.
    }
    await executeSyncSql(
      "DELETE FROM outbox_ops WHERE entity_type = 'note' AND entity_id = ?",
      [row.id],
    );
    await executeSyncSql(
      "DELETE FROM sync_conflicts WHERE entity_type = 'note' AND entity_id = ?",
      [row.id],
    );
  }

  const plots = await executeSyncSql(
    'SELECT id FROM plots WHERE project_id = ?',
    [projectId],
  );
  for (let index = 0; index < plots.rows.length; index += 1) {
    const row = plots.rows.item(index) as { id: string };
    await executeSyncSql(
      "DELETE FROM outbox_ops WHERE entity_type = 'plot' AND entity_id = ?",
      [row.id],
    );
    await executeSyncSql(
      "DELETE FROM sync_conflicts WHERE entity_type = 'plot' AND entity_id = ?",
      [row.id],
    );
  }

  await executeSyncSql('DELETE FROM notes WHERE project_id = ?', [projectId]);
  await executeSyncSql('DELETE FROM plots WHERE project_id = ?', [projectId]);
  await executeSyncSql('DELETE FROM projects WHERE id = ?', [projectId]);
  await executeSyncSql('DELETE FROM local_photos WHERE project_id = ?', [projectId]);
  await executeSyncSql(
    "DELETE FROM outbox_ops WHERE entity_type = 'project' AND entity_id = ?",
    [projectId],
  );
  await executeSyncSql(
    "DELETE FROM sync_conflicts WHERE entity_type = 'project' AND entity_id = ?",
    [projectId],
  );

  await Promise.all(
    Array.from(photoIds).map(async id => {
      const path = `${APP_PHOTO_DIR}/${id}.jpg`;
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
    }),
  );
};

export const publishLocalPhotoInventoryChanged = notifyLocalPhotoInventoryChanged;

const settingsAlert = (title: string, message: string) => {
  Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => void Linking.openSettings() },
  ]);
};

const requestAndroidPermission = async (
  permission: Parameters<typeof PermissionsAndroid.check>[0],
  title: string,
  message: string,
  blockedTitle: string,
) => {
  const hasPermission = await PermissionsAndroid.check(permission);
  if (hasPermission) return true;

  const result = await PermissionsAndroid.request(permission, {
    title,
    message,
    buttonPositive: 'Continue',
    buttonNegative: 'Not now',
  });

  if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    settingsAlert(blockedTitle, 'You can allow ResearchPal access in system settings. Your existing notes and photos are unaffected.');
  }

  return false;
};

const ensureCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;
  return requestAndroidPermission(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    'Camera Permission',
    'ResearchPal needs camera access to attach photos to notes.',
    'Camera access is disabled',
  );
};

export const usePhotoStorage = () => {
  const showPickerError = useCallback((error: unknown, capability: 'camera' | 'photos') => {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as any).code) : '';
    const denied = code.includes('permission') || code.includes('denied');
    Alert.alert(
      denied ? `${capability === 'camera' ? 'Camera' : 'Photo'} access is disabled` : `Unable to open ${capability}`,
      denied ? `You can allow ResearchPal access in system settings. Your existing ideas and photos are unaffected.` : 'Please try again.',
      denied ? [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => void Linking.openSettings() }] : [{ text: 'OK' }],
    );
  }, []);
  const pickFromCamera = useCallback(async (): Promise<
    StoredPhoto[] | null
  > => {
    if (!await ensureCameraPermission()) return null;
    let res;
    try { res = await launchCamera(CAMERA_OPTIONS); }
    catch (error) { showPickerError(error, 'camera'); return null; }

    if (res.errorCode) { showPickerError(res, 'camera'); return null; }

    if (!res.assets?.length) return null;

    const photos: StoredPhoto[] = [];

    for (const asset of res.assets) {
      if (asset.uri) {
        photos.push(await copyPhotoToAppStorage(asset.uri, asset.fileName));
      }
    }

    if (photos.length) notifyLocalPhotoInventoryChanged();

    return photos;
  }, [showPickerError]);

  const pickFromGallery = useCallback(async (): Promise<
    StoredPhoto[] | null
  > => {
    let res;
    try { res = await launchImageLibrary({ ...PHOTO_PICKER_OPTIONS, selectionLimit: 0 }); }
    catch (error) { showPickerError(error, 'photos'); return null; }

    if (res.errorCode) { showPickerError(res, 'photos'); return null; }

    if (!res.assets?.length) return null;

    const photos: StoredPhoto[] = [];

    for (const asset of res.assets) {
      if (asset.uri) {
        photos.push(await copyPhotoToAppStorage(asset.uri, asset.fileName));
      }
    }

    if (photos.length) notifyLocalPhotoInventoryChanged();

    return photos;
  }, [showPickerError]);

  const openPhotoPicker = useCallback(
    (onComplete?: (photos: StoredPhoto[]) => void) => {
      Alert.alert('Add photo', 'Choose source', [
        {
          text: 'Camera',
          onPress: async () => {
            const photos = await pickFromCamera();
            if (photos && onComplete) onComplete(photos);
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const photos = await pickFromGallery();
            if (photos && onComplete) onComplete(photos);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [pickFromCamera, pickFromGallery],
  );
  const getPhotosByIds = useCallback(
    async (photoIds: string[]): Promise<StoredPhoto[]> => {
      const photos: StoredPhoto[] = [];

      for (const id of photoIds) {
        const photo = await getLocalPhotoById(id);
        if (photo) {
          photos.push(photo);
        }
      }

      return photos;
    },
    [],
  );

  return {
    openPhotoPicker,
    pickFromCamera,
    pickFromGallery,
    getPhotosByIds,
  };
};
