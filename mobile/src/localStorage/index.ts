import { useCallback } from 'react';
import { Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

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
