import { View, Image, FlatList, Dimensions, Pressable, RefreshControl } from 'react-native';
import React, { useCallback, useState } from 'react';
import { deletePhoto, getCachedPhotoLibrary, getMergedPhotoLibrary, resolvePhotoFile } from '../../../services/Photos/index';
import { StoredPhoto } from '../../../localStorage';
import { useAuthStore } from '../../../store/auth.store';
import { Screen } from '../../../components/commonStyles/styles';
import PhotosModel from './PhotosModel';
import { useFocusEffect } from '@react-navigation/native';
import LoadingState from '../../../components/LoadingState';
import ScreenHeader from '../../../components/ScreenHeader';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const HORIZONTAL_PADDING = 16;
const IMAGE_SIZE = Math.floor(
  (SCREEN_WIDTH - HORIZONTAL_PADDING - (NUM_COLUMNS + 1) * 8) / NUM_COLUMNS,
);

const Photos = () => {
  const [allPhotos, setAllPhotos] = useState<StoredPhoto[]>([]);
  const [selectedPhoto, setselectedPhoto] = useState<StoredPhoto | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const userId = useAuthStore(state => state.user?._id);

  const resolvePhotoRows = useCallback(async (photos: StoredPhoto[]) => {
    const resolved = await Promise.all(photos.map(async photo => ({
      ...photo,
      location: await resolvePhotoFile(photo, 'thumbnail').catch(() => photo.location),
    })));
    return resolved.filter(photo => Boolean(photo.location));
  }, []);

  const loadPhotos = useCallback(async (options: { forceRemote?: boolean } = {}) => {
    if (!userId) {
      setIsLoadingPhotos(false);
      return;
    }

    if (!options.forceRemote) setIsLoadingPhotos(true);
    try {
      if (!options.forceRemote) {
        const cached = await resolvePhotoRows(await getCachedPhotoLibrary());
        setAllPhotos(cached);
      }

      const photos = await getMergedPhotoLibrary({ forceRemote: options.forceRemote });
      const resolved = await resolvePhotoRows(photos);
      setAllPhotos(resolved);
    } finally {
      setIsLoadingPhotos(false);
      setIsRefreshing(false);
    }
  }, [resolvePhotoRows, userId]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPhotos({ forceRemote: true });
  }, [loadPhotos]);

  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [loadPhotos]),
  );

  return (
    <Screen>
      <ScreenHeader title="Photos" subtitle={`${allPhotos.length} images across all research`} />
      <View style={{ flex: 1 }}>
        {isLoadingPhotos ? (
          <LoadingState label="Loading photos..." fullScreen />
        ) : (
        <FlatList
          data={allPhotos}
          keyExtractor={item => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={{ marginTop: 16 }}
          columnWrapperStyle={{
            justifyContent: 'flex-start',
            gap: 8,
            marginBottom: 8,
          }}
          refreshControl={(
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          )}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable onPress={async () => {
              const standardLocation = await resolvePhotoFile(item, 'standard').catch(() => item.location);
              setselectedPhoto({ ...item, standardLocation });
            }}>
              <View style={{ width: IMAGE_SIZE, aspectRatio: 1 }}>
                <Image
                  source={{ uri: item.remoteUrl || `file://${item.location}` }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 8,
                  }}
                  resizeMode="cover"
                />
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            <View style={{ flexDirection: 'row', marginBottom: 70 }}>
              {[...Array(NUM_COLUMNS)].map((_, idx) => (
                <View key={idx} style={{ width: IMAGE_SIZE, aspectRatio: 1 }} />
              ))}
            </View>
          }
        />
        )}
      </View>
      {selectedPhoto && (
        <PhotosModel
          visible={true}
          onClose={() => setselectedPhoto(null)}
          selectedPhoto={selectedPhoto}
          onDelete={async () => {
            await deletePhoto(selectedPhoto.id);
            setAllPhotos(current => current.filter(photo => photo.id !== selectedPhoto.id));
            setselectedPhoto(null);
          }}
        />
      )}
    </Screen>
  );
};

export default Photos;
