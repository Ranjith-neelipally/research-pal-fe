import {
  Alert,
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import React, { useState } from 'react';
import MyModal, { MyModalProps } from '../../../components/modal';
import {
  SmallMutedText,
  TextSecondary,
} from '../../../components/commonStyles/styles';
import { StoredPhoto } from '../../../localStorage';
import {
  PillPrimary,
  PillPrimaryText,
  PillSecondary,
  PillSecondaryText,
  TabButton,
  TabButtonText,
  Tabs,
} from './styles';
import { type CloudPhoto } from '../../../services/Photos/index';
import { PlotNote, normalizeContent } from '../Projects/ProjectNoteDetails/helpers';
import LoadingState from '../../../components/LoadingState';

interface PhotosModelProps extends MyModalProps {
  selectedPhoto: StoredPhoto;
  onDelete?: () => Promise<void>;
}

interface PhotoDetails {
  _id: string;
  projectId: string;
  plotId: string;
  content?: PlotNote['content'];
  userId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  replication: number;
  treatment: number;
  replicationName?: string;
  treatmentName?: string;
  __v: number;
  ProjectTitle: string;
}

const PhotosModel = ({
  visible,
  onClose,
  selectedPhoto,
  onDelete,
}: PhotosModelProps) => {
  const [selectedTab, setselectedTab] = useState('plotDetails');
  const [photoDetails, setphotoDetails] = useState<PhotoDetails | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const normalizedNotes = normalizeContent(photoDetails?.content);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const imageUri = selectedPhoto.standardLocation
    ? `file://${selectedPhoto.standardLocation}`
    : selectedPhoto.remoteUrl || `file://${selectedPhoto.location}`;
  const scale = React.useRef(new Animated.Value(1)).current;
  const translateX = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;
  const scaleRef = React.useRef(1);
  const translateRef = React.useRef({ x: 0, y: 0 });
  const gestureStartScale = React.useRef(1);
  const gestureStartTranslate = React.useRef({ x: 0, y: 0 });
  const initialPinchDistance = React.useRef(0);

  React.useEffect(() => {
    const cloudPhoto = selectedPhoto.cloudPhoto as CloudPhoto | undefined;
    const notePreview = cloudPhoto?.notePreview;
    const now = selectedPhoto.date || new Date().toISOString();

    if (__DEV__) {
      console.log('[PhotoCache] detail loaded locally', {
        photoId: selectedPhoto.id,
        hasCloudMetadata: Boolean(cloudPhoto),
        projectId: selectedPhoto.projectId || cloudPhoto?.projectId,
        plotId: selectedPhoto.plotId || cloudPhoto?.plotId,
        noteId: selectedPhoto.noteId ?? cloudPhoto?.noteId,
      });
    }

    setphotoDetails({
      _id: selectedPhoto.noteId || cloudPhoto?.noteId || selectedPhoto.id,
      projectId: selectedPhoto.projectId || cloudPhoto?.projectId || '',
      plotId: selectedPhoto.plotId || cloudPhoto?.plotId || '',
      content: notePreview ? [{ note: [notePreview], photoIds: [selectedPhoto.id] }] : [],
      userId: '',
      createdAt: now,
      updatedAt: now,
      title: cloudPhoto?.plotTitle || selectedPhoto.plotId || 'Unknown plot',
      replication: cloudPhoto?.replication || 0,
      treatment: cloudPhoto?.treatment || 0,
      replicationName: cloudPhoto?.replicationName || undefined,
      treatmentName: cloudPhoto?.treatmentName || undefined,
      __v: 0,
      ProjectTitle: cloudPhoto?.projectTitle || selectedPhoto.projectId || 'Unknown project',
    });
    setIsLoadingDetails(false);
  }, [selectedPhoto]);

  React.useEffect(() => {
    Image.getSize(
      imageUri,
      (width, height) => {
        setImageSize({ width, height });
      },
      () => {
        setImageSize({ width: 1, height: 1 });
      },
    );
  }, [imageUri]);

  const resetViewerTransform = React.useCallback(() => {
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
    gestureStartScale.current = 1;
    gestureStartTranslate.current = { x: 0, y: 0 };
    initialPinchDistance.current = 0;
  }, [scale, translateX, translateY]);

  const clamp = React.useCallback((value: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(value, min), max);
  }, []);

  const imageAspectRatio = imageSize.width / imageSize.height || 1;
  const previewSize = windowWidth - 72;
  const viewerBoundsWidth = windowWidth;
  const viewerBoundsHeight = windowHeight * 0.78;

  const displayedImageSize = React.useMemo(() => {
    const widthBasedHeight = viewerBoundsWidth / imageAspectRatio;
    if (widthBasedHeight <= viewerBoundsHeight) {
      return {
        width: viewerBoundsWidth,
        height: widthBasedHeight,
      };
    }

    return {
      width: viewerBoundsHeight * imageAspectRatio,
      height: viewerBoundsHeight,
    };
  }, [imageAspectRatio, viewerBoundsHeight, viewerBoundsWidth]);

  const getPinchDistance = (touches: readonly any[]) => {
    const [firstTouch, secondTouch] = touches;
    const dx = firstTouch.pageX - secondTouch.pageX;
    const dy = firstTouch.pageY - secondTouch.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: event => {
          const touches = event.nativeEvent.touches;

          gestureStartTranslate.current = { ...translateRef.current };
          gestureStartScale.current = scaleRef.current;

          if (touches.length >= 2) {
            initialPinchDistance.current = getPinchDistance(touches);
          }
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;

          if (touches.length >= 2) {
            const pinchDistance = getPinchDistance(touches);

            if (!initialPinchDistance.current) {
              initialPinchDistance.current = pinchDistance;
              gestureStartScale.current = scaleRef.current;
              return;
            }

            const nextScale = clamp(
              gestureStartScale.current *
                (pinchDistance / initialPinchDistance.current),
              1,
              4,
            );

            scale.setValue(nextScale);
            scaleRef.current = nextScale;
            return;
          }

          if (scaleRef.current <= 1) {
            return;
          }

          const maxTranslateX =
            ((displayedImageSize.width * scaleRef.current) -
              displayedImageSize.width) /
            2;
          const maxTranslateY =
            ((displayedImageSize.height * scaleRef.current) -
              displayedImageSize.height) /
            2;

          const nextTranslateX = clamp(
            gestureStartTranslate.current.x + gestureState.dx,
            -maxTranslateX,
            maxTranslateX,
          );
          const nextTranslateY = clamp(
            gestureStartTranslate.current.y + gestureState.dy,
            -maxTranslateY,
            maxTranslateY,
          );

          translateX.setValue(nextTranslateX);
          translateY.setValue(nextTranslateY);
          translateRef.current = {
            x: nextTranslateX,
            y: nextTranslateY,
          };
        },
        onPanResponderRelease: () => {
          initialPinchDistance.current = 0;

          if (scaleRef.current <= 1.02) {
            Animated.parallel([
              Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
              }),
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
              }),
              Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
              }),
            ]).start();
            scaleRef.current = 1;
            translateRef.current = { x: 0, y: 0 };
            return;
          }

          gestureStartTranslate.current = { ...translateRef.current };
          gestureStartScale.current = scaleRef.current;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [
      clamp,
      displayedImageSize.height,
      displayedImageSize.width,
      scale,
      translateX,
      translateY,
    ],
  );

  const openViewer = () => {
    resetViewerTransform();
    setIsViewerOpen(true);
  };

  const closeViewer = () => {
    setIsViewerOpen(false);
    resetViewerTransform();
  };

  return (
    <>
      <MyModal visible={visible} onClose={onClose}>
        <Pressable
          onPress={openViewer}
          style={{
            width: '100%',
            alignItems: 'center',
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{
              width: previewSize,
              height: previewSize,
              borderRadius: 12,
              backgroundColor: '#0f141a',
            }}
            resizeMode="cover"
          />
          <SmallMutedText style={{ marginTop: 10 }}>
            Tap photo to expand and zoom
          </SmallMutedText>
        </Pressable>
      {isLoadingDetails ? (
        <LoadingState label="Loading photo details..." />
      ) : (
        <>
      <View style={{ gap: 16 }}>
        <Tabs>
          <TabButton
            active={selectedTab === 'plotDetails'}
            onPress={() => setselectedTab('plotDetails')}
          >
            <TabButtonText active={selectedTab === 'plotDetails'}>
              Plot Details
            </TabButtonText>
          </TabButton>
          <TabButton
            active={selectedTab === 'notes'}
            onPress={() => setselectedTab('notes')}
          >
            <TabButtonText active={selectedTab === 'notes'}>
              View Notes
            </TabButtonText>
          </TabButton>
        </Tabs>
        {selectedTab === 'plotDetails' && (
          <View>
            <View style={{ gap: 8, flexDirection: 'row' }}>
              <PillPrimary>
                <PillPrimaryText>Plot</PillPrimaryText>
              </PillPrimary>
              <PillSecondary>
                <PillSecondaryText>{photoDetails?.title}</PillSecondaryText>
              </PillSecondary>
            </View>
            <View>
              <SmallMutedText>Project</SmallMutedText>
              <TextSecondary>{photoDetails?.ProjectTitle}</TextSecondary>
              <SmallMutedText>Replication</SmallMutedText>
              <TextSecondary>{photoDetails?.replicationName || `R${photoDetails?.replication}`}</TextSecondary>
              <SmallMutedText>Treatment</SmallMutedText>
              <TextSecondary>{photoDetails?.treatmentName || `T${photoDetails?.treatment}`}</TextSecondary>
            </View>
          </View>
        )}
        {selectedTab === 'notes' && (
          <View>
            <SmallMutedText>Related Notes</SmallMutedText>
            <TextSecondary>
              {normalizedNotes || 'No related notes for this photo.'}
            </TextSecondary>
          </View>
        )}
      </View>
        </>
      )}
      {onDelete && (
        <TouchableOpacity
          onPress={() => Alert.alert('Delete photo', 'This removes the photo from ResearchPal and cloud storage.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void onDelete().catch(() => Alert.alert('Delete failed', 'Unable to delete this photo. Please try again.')) },
          ])}
          style={{ marginTop: 16, alignSelf: 'center' }}
        >
          <TextSecondary style={{ color: '#ff4d4f' }}>Delete photo</TextSecondary>
        </TouchableOpacity>
      )}
      </MyModal>

      <Modal visible={isViewerOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.96)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={closeViewer}
            style={{
              position: 'absolute',
              top: 48,
              right: 24,
              zIndex: 2,
            }}
          >
            <TextSecondary style={{ color: '#e7ebef' }}>Close</TextSecondary>
          </TouchableOpacity>

          <View
            style={{
              width: viewerBoundsWidth,
              height: viewerBoundsHeight,
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
            {...panResponder.panHandlers}
          >
            <Animated.Image
              source={{ uri: imageUri }}
              style={{
                width: displayedImageSize.width,
                height: displayedImageSize.height,
                transform: [
                  { translateX },
                  { translateY },
                  { scale },
                ],
              }}
              resizeMode="contain"
            />
          </View>

          <SmallMutedText style={{ marginTop: 16, color: '#c3ccd5' }}>
            Pinch to zoom. Drag to move while zoomed.
          </SmallMutedText>
        </View>
      </Modal>
    </>
  );
};

export default PhotosModel;
