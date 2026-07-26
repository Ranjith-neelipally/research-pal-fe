import { useCallback } from 'react';
import { Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { executeSyncSql } from '../sync/sqlite/database';

export interface StoredPhoto {
  id: string;
  name: string;
  location: string;
  date: string;
}

const APP_PHOTO_DIR = `${RNFS.DocumentDirectoryPath}/photos`;

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
  }

  await executeSyncSql('DELETE FROM notes WHERE project_id = ?', [projectId]);
  await executeSyncSql('DELETE FROM plots WHERE project_id = ?', [projectId]);
  await executeSyncSql('DELETE FROM projects WHERE id = ?', [projectId]);
  await executeSyncSql(
    "DELETE FROM outbox_ops WHERE entity_type = 'project' AND entity_id = ?",
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

export const usePhotoStorage = () => {
  const pickFromCamera = useCallback(async (): Promise<
    StoredPhoto[] | null
  > => {
    const res = await launchCamera({ mediaType: 'photo' });

    if (!res.assets?.length) return null;

    const photos: StoredPhoto[] = [];

    for (const asset of res.assets) {
      if (asset.uri) {
        photos.push(await copyPhotoToAppStorage(asset.uri));
      }
    }

    return photos;
  }, []);

  const pickFromGallery = useCallback(async (): Promise<
    StoredPhoto[] | null
  > => {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 0,
    });

    if (!res.assets?.length) return null;

    const photos: StoredPhoto[] = [];

    for (const asset of res.assets) {
      if (asset.uri) {
        photos.push(await copyPhotoToAppStorage(asset.uri));
      }
    }

    return photos;
  }, []);

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
