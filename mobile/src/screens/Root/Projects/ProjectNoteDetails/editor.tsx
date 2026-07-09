import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, CalendarDays, Plus, Save, Trash2, X, XIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import Button from '../../../../components/Button';
import Input from '../../../../components/Input';
import { StoredPhoto, usePhotoStorage } from '../../../../localStorage';
import {
  addPlotNoteService,
  deletePlotNoteService,
  updatePlotNoteService,
} from '../../../../services/Projects/Plot';
import {
  formatDate,
  formatContentForInput,
  formatContentForSave,
  getPhotoIdsFromContent,
  PlotNote,
} from './helpers';

const PlotNoteEditorScreen = ({ route }: any) => {
  const navigation = useNavigation<any>();
  const { projectId, plotId, userId, plotName, note } = route.params as {
    projectId: string;
    plotId: string;
    userId: string;
    plotName?: string;
    note?: PlotNote;
  };

  const { openPhotoPicker, getPhotosByIds } = usePhotoStorage();

  const [selectedPlotNote] = useState<PlotNote | undefined>(note);
  const [noteContent, setNoteContent] = useState(
    formatContentForInput(note?.content),
  );
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [contentError, setContentError] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<StoredPhoto | null>(null);

  React.useEffect(() => {
    const loadInitialPhotos = async () => {
      const photoIds = note?.photoIds?.length
        ? note.photoIds
        : getPhotoIdsFromContent(note?.content);

      if (!photoIds.length) {
        setPhotos([]);
        return;
      }

      const stored = await getPhotosByIds(photoIds);
      setPhotos(stored);
    };

    loadInitialPhotos();
  }, [getPhotosByIds, note]);

  const handleInputChange = (text: string) => {
    if (contentError) {
      setContentError('');
    }

    setNoteContent(previous => {
      if (text.length < previous.length) return text;
      if (!text) return '';
      if (text.endsWith('\n')) return `${text}• `;
      return text.startsWith('•') ? text : `• ${text}`;
    });
  };

  const handleAddPhotos = () => {
    openPhotoPicker(newPhotos => {
      if (!newPhotos) return;

      setPhotos(previous => {
        const existingIds = new Set(previous.map(photo => photo.id));
        const uniqueNewPhotos = newPhotos.filter(photo => !existingIds.has(photo.id));
        return [...previous, ...uniqueNewPhotos];
      });
    });
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(previous => previous.filter(photo => photo.id !== photoId));
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const content = formatContentForSave(noteContent);
      const photoIds = photos.map(photo => photo.id);

      if (!content.length) {
        setContentError('Add at least one note line before saving photos.');
        return;
      }

      if (selectedPlotNote?._id) {
        await updatePlotNoteService(
          projectId,
          plotId,
          content,
          userId,
          selectedPlotNote._id,
          photoIds,
        );
      } else {
        await addPlotNoteService(projectId, plotId, content, userId, photoIds);
      }

      navigation.goBack();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedPlotNote?._id) {
      navigation.goBack();
      return;
    }

    Alert.alert('Delete Note', 'This note will be removed from the plot.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePlotNoteService(
            selectedPlotNote._id,
            userId,
            projectId,
            plotId,
          );
          navigation.goBack();
        },
      },
    ]);
  };

  const wordCount = noteContent
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#101318' }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 12,
          gap: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              flex: 1,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ArrowLeft size={20} color="#e7ebef" />
            </TouchableOpacity>

            <View
              style={{
                minWidth: 54,
                height: 54,
                borderRadius: 18,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 8,
                backgroundColor: route.params.plotColor || '#35b164',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                {`R${route.params.plotIndex?.[0] ?? ''} T${route.params.plotIndex?.[1] ?? ''}`}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
                {selectedPlotNote?._id ? 'Edit Note' : 'Add Note'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <CalendarDays size={14} color="#7b899d" />
                <Text style={{ color: '#7b899d', fontSize: 14 }}>
                  {selectedPlotNote?.updatedAt
                    ? formatDate(selectedPlotNote.updatedAt)
                    : plotName || 'Plot Notes'}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {selectedPlotNote?._id && (
              <TouchableOpacity
                onPress={handleDelete}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={22} color="#ff4d4f" />
              </TouchableOpacity>
            )}

          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={24}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 120,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: '#171c24',
              borderWidth: 1,
              borderColor: '#232a36',
              borderRadius: 28,
              padding: 18,
              gap: 16,
              flex: 0.6,
              minHeight: 360,
            }}
          >
            <Input
              multiline
              numberOfLines={16}
              value={noteContent}
              onChangeText={handleInputChange}
              placeholder="Write your observations..."
              error={contentError}
              style={{ flex: 1, textAlignVertical: 'top' }}
            />
            <Text style={{ color: '#7b899d', fontSize: 14 }}>
              {`${wordCount}/5,000 words`}
            </Text>
          </View>

          <View style={{ gap: 16, flex: 0.4 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#8fa3c4', fontSize: 18, fontWeight: '600' }}>
                {`Photos (${photos.length})`}
              </Text>

              <TouchableOpacity
                onPress={handleAddPhotos}
                style={{
                  backgroundColor: '#2a313d',
                  borderRadius: 999,
                  minHeight: 40,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Plus size={18} color="#e7ebef" />
                <Text style={{ color: '#e7ebef', fontSize: 16, fontWeight: '500' }}>
                  Add Photo
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={photos}
              horizontal
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={{ paddingRight: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item: photo }) => (
                <Pressable onPress={() => setPreviewPhoto(photo)}>
                  <TouchableOpacity
                    onPress={() => handleRemovePhoto(photo.id)}
                    style={{
                      backgroundColor: '#0009',
                      justifyContent: 'center',
                      borderRadius: 99,
                      width: 24,
                      height: 24,
                      alignItems: 'center',
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      zIndex: 1,
                    }}
                  >
                    <XIcon size={14} color="#e7ebef" />
                  </TouchableOpacity>

                  <Image
                    source={{ uri: `file://${photo.location}` }}
                    style={{ width: 160, height: 160, borderRadius: 20 }}
                  />
                </Pressable>
              )}
            />
          </View>

          <Button onPress={handleSave} disabled={isSaving}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Save size={18} color="#101318" />
              <Text style={{ color: '#101318', fontSize: 16, fontWeight: '700' }}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </View>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

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
                source={{ uri: `file://${previewPhoto.location}` }}
                style={{ width: '90%', height: '70%', borderRadius: 12 }}
                resizeMode="contain"
              />

              <TouchableOpacity
                onPress={() => setPreviewPhoto(null)}
                style={{ position: 'absolute', top: 40, right: 20 }}
              >
                <X color="#fff" size={28} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default PlotNoteEditorScreen;
