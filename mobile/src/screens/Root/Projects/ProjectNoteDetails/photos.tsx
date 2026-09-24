import { View, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import React, { useState } from 'react';
import { Plus, X, XIcon } from 'lucide-react-native';
import {
  HeaderSecondary,
  TextSecondary,
} from '../../../../components/commonStyles/styles';
import { Theme } from '../../../../components/theme';
import { StoredPhoto } from '../../../../localStorage';

interface PhotosProps {
  photos: StoredPhoto[];
  onAddPress: () => void;
  onRemovePhoto?: (id: string) => void;
}

const Photos = ({ photos, onAddPress, onRemovePhoto }: PhotosProps) => {
  const [previewPhoto, setPreviewPhoto] = useState<StoredPhoto | null>(null);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <HeaderSecondary>Photos ({photos.length})</HeaderSecondary>

        <TouchableOpacity
          onPress={onAddPress}
          style={{
            backgroundColor: Theme.colors.mutedForeground,
            padding: 8,
            borderRadius: 99,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Plus color="#e7ebef" size={14} />
          <TextSecondary>Add</TextSecondary>
        </TouchableOpacity>
      </View>

      {/* Thumbnails */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {photos.map(photo => (
          <Pressable key={photo.id} onPress={() => setPreviewPhoto(photo)}>
            {onRemovePhoto && (
              <TouchableOpacity
                onPress={() => onRemovePhoto(photo.id)}
                style={{
                  backgroundColor: `#0009`,
                  justifyContent: 'center',
                  borderRadius: 99,
                  width: 24,
                  height: 24,
                  alignItems: 'center',
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  zIndex: 1,
                }}
              >
                <XIcon size={14} color="#e7ebef" />
              </TouchableOpacity>
            )}
            <Image
              source={{ uri: photo.remoteUrl || `file://${photo.location}` }}
              style={{ width: 80, height: 80, borderRadius: 8 }}
            />
          </Pressable>
        ))}
      </View>

      {/* Preview Modal */}
      <Modal visible={!!previewPhoto} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {previewPhoto && (
            <>
              <Image
                source={{ uri: previewPhoto.remoteUrl || `file://${previewPhoto.location}` }}
                style={{ width: '90%', height: '70%', borderRadius: 12 }}
                resizeMode="contain"
              />

              {/* Close */}
              <TouchableOpacity
                onPress={() => setPreviewPhoto(null)}
                style={{ position: 'absolute', top: 40, right: 20 }}
              >
                <X color="#fff" size={28} />
              </TouchableOpacity>

              {/* Remove */}
              {onRemovePhoto && (
                <TouchableOpacity
                  onPress={() => {
                    onRemovePhoto(previewPhoto.id);
                    setPreviewPhoto(null);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: 40,
                    backgroundColor: '#dc2626',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                >
                  <TextSecondary style={{ color: '#fff' }}>
                    Remove
                  </TextSecondary>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default Photos;
