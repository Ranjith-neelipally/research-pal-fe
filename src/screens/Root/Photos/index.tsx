import { View, Image, FlatList, Dimensions, Pressable } from 'react-native';
import React, { useCallback, useState } from 'react';
import { getAllPhotoIds } from '../../../services/Photos';
import { StoredPhoto, usePhotoStorage } from '../../../localStorage';
import { useAuthStore } from '../../../store/auth.store';
import { H1, MutedText, Screen } from '../../../components/commonStyles/styles';
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
  const { getPhotosByIds } = usePhotoStorage();
  const userId = useAuthStore(state => state.user?._id);

  const getPhotoIds = useCallback(async () => {
    if (!userId) {
      setIsLoadingPhotos(false);
      return;
    }

    setIsLoadingPhotos(true);
    const response = await getAllPhotoIds(userId!);
    const stored = await getPhotosByIds(response.data?.allPhotoIds || []);
    setAllPhotos(stored);
    setIsLoadingPhotos(false);
  }, [getPhotosByIds, userId]);

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
            <Pressable onPress={() => setselectedPhoto(item)}>
              <View style={{ width: IMAGE_SIZE, aspectRatio: 1 }}>
                <Image
                  source={{ uri: `file://${item.location}` }}
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
        />
      )}
    </Screen>
  );
};

export default Photos;
