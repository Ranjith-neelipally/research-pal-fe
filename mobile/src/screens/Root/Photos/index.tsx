import { View, Image, FlatList, Dimensions, Pressable } from 'react-native';
import React, { useCallback, useState } from 'react';
import { deletePhoto, getPhotoLibrary, resolveCloudPhotoFile, syncMissingCloudPhotos } from '../../../services/Photos/index';
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
  const userId = useAuthStore(state => state.user?._id);

  const getPhotoIds = useCallback(async () => {
    if (!userId) {
      setIsLoadingPhotos(false);
      return;
    }

    setIsLoadingPhotos(true);
    try {
      const cloud = await getPhotoLibrary();
      await syncMissingCloudPhotos(cloud);
      setAllPhotos(await Promise.all(cloud.map(async photo => ({
        id: photo.photoId,
        name: `${photo.photoId}.jpg`,
        location: await resolveCloudPhotoFile(photo, 'thumbnail'),
        mimeType: photo.variants.thumbnail.mimeType,
        date: photo.capturedAt,
        cloudPhoto: photo,
      }))));
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      getPhotoIds();
    }, [getPhotoIds]),
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
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable onPress={async () => {
              const cloudPhoto = item.cloudPhoto;
              const standardLocation = cloudPhoto ? await resolveCloudPhotoFile(cloudPhoto as any, 'standard') : item.location;
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
          userId={userId!}
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
