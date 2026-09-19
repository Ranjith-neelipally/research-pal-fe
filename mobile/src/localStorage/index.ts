import { useCallback } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { executeSyncSql } from '../sync/sqlite/database';
import { getDeviceStorageInfo } from '../services/deviceStorage';

export interface StoredPhoto {
  id: string;
  name: string;
  location: string;
  date: string;
}

const APP_PHOTO_DIR = `${RNFS.DocumentDirectoryPath}/photos`;
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

const copyPhotoToAppStorage = async (uri: string): Promise<StoredPhoto> => {
  await ensurePhotoDir();

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `${id}.jpg`;
  const destPath = `${APP_PHOTO_DIR}/${name}`;

  await RNFS.copyFile(uri.replace('file://', ''), destPath);

  return {
    id,
    name,
    location: destPath,
    date: new Date().toISOString(),
  };
};

const getPhotoById = async (id: string): Promise<StoredPhoto | null> => {
  const name = `${id}.jpg`;
  const path = `${APP_PHOTO_DIR}/${name}`;

  const exists = await RNFS.exists(path);
  if (!exists) return null;

  const stat = await RNFS.stat(path);

  return {
    id,
    name,
    location: path,
    date: stat.mtime
      ? new Date(stat.mtime).toISOString()
      : new Date().toISOString(),
  };
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

export const getPhotoByIdForStreaming = getPhotoById;

export const getAvailablePhotoIdsForStreaming = async (): Promise<string[]> => {
  const directoryExists = await RNFS.exists(APP_PHOTO_DIR);
  if (!directoryExists) return [];

  const entries = await RNFS.readDir(APP_PHOTO_DIR);
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.jpg'))
    .map(entry => entry.name.replace(/\.jpg$/, ''));
};

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
    try { res = await launchCamera({ mediaType: 'photo' }); }
    catch (error) { showPickerError(error, 'camera'); return null; }

    if (res.errorCode) { showPickerError(res, 'camera'); return null; }

    if (!res.assets?.length) return null;

    const photos: StoredPhoto[] = [];

    for (const asset of res.assets) {
      if (asset.uri) {
        photos.push(await copyPhotoToAppStorage(asset.uri));
      }
    }

    if (photos.length) notifyLocalPhotoInventoryChanged();

    return photos;
  }, [showPickerError]);

  const pickFromGallery = useCallback(async (): Promise<
    StoredPhoto[] | null
  > => {
    let res;
    try { res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 0 }); }
    catch (error) { showPickerError(error, 'photos'); return null; }

    if (res.errorCode) { showPickerError(res, 'photos'); return null; }

    if (!res.assets?.length) return null;

    const photos: StoredPhoto[] = [];

    for (const asset of res.assets) {
      if (asset.uri) {
        photos.push(await copyPhotoToAppStorage(asset.uri));
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
        const photo = await getPhotoById(id);
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
