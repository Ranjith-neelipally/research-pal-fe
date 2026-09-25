import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ListRenderItem,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  ImageIcon,
  PencilLine,
  Plus,
  Trash2,
} from 'lucide-react-native';

import {
  deletePlotNoteService,
  getProjectNotesByDateService,
  getPlotNoteService,
} from '../../../../services/Projects/Plot';
import { StoredPhoto, usePhotoStorage } from '../../../../localStorage';
import { getCachedPhotoLibrary, resolvePhotoFile } from '../../../../services/Photos';
import { Card } from '../../../../components/Card/styles';
import {
  getPlotDisplayName,
  getTreatmentColor,
  Plot,
} from '../AddNewProject/Structure/helpers';
import {
  formatTime,
  getCardPreviewContent,
  getDayLabel,
  getPhotoIdsFromContent,
  PAGE_SIZE,
  PlotNote,
} from './helpers';

type NoteListItem =
  | {
      type: 'section';
      key: string;
      label: string;
      count: number;
    }
  | {
      type: 'note';
      key: string;
      note: PlotNote;
    };

const PlotNoteDetailsScreen = ({ route }: any) => {
  const navigation = useNavigation<any>();
  const {
    projectId,
    plotId,
    userId,
    plotColor,
    plotName,
    plotIndex,
    date,
    plotsData = [],
  } =
    route.params;
  const isDateMode = Boolean(date && !plotId);

  const { getPhotosByIds } = usePhotoStorage();

  const [plotNotes, setPlotNotes] = useState<PlotNote[]>([]);
  const [plotNotePhotos, setPlotNotePhotos] = useState<Record<string, StoredPhoto[]>>(
    {},
  );
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const sortNotes = useCallback((notes: PlotNote[]) =>
    [...notes].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    ), []);

  const mergeNotes = useCallback((currentNotes: PlotNote[], incomingNotes: PlotNote[]) => {
    const noteMap = new Map<string, PlotNote>();

    currentNotes.forEach(note => noteMap.set(note._id, note));
    incomingNotes.forEach(note => noteMap.set(note._id, note));

    return sortNotes(Array.from(noteMap.values()));
  }, [sortNotes]);

  const loadPlotNotePhotos = useCallback(async (notes: PlotNote[]) => {
    const photoIdSet = new Set<string>();
    notes.forEach(note => {
      const photoIds = note.photoIds?.length ? note.photoIds : getPhotoIdsFromContent(note.content);
      photoIds.forEach(photoId => photoIdSet.add(photoId));
    });
    const cached = photoIdSet.size ? await getCachedPhotoLibrary().catch(() => []) : [];
    const photoEntries = await Promise.all(
      notes.map(async note => {
        const photoIds = note.photoIds?.length
          ? note.photoIds
          : getPhotoIdsFromContent(note.content);

        if (!photoIds.length) {
          return [note._id, []] as const;
        }

        const storedPhotos = await getPhotosByIds(photoIds);
        const localIds = new Set(storedPhotos.map(photo => photo.id));
        const remotePhotos = await Promise.all(cached
          .filter(photo => photoIds.includes(photo.id) && !localIds.has(photo.id))
          .map(async photo => ({
            ...photo,
            location: await resolvePhotoFile(photo, 'thumbnail').catch(() => photo.location),
          })));
        return [note._id, [...storedPhotos, ...remotePhotos].filter(photo => Boolean(photo.location)) as StoredPhoto[]] as const;
      }),
    );

    setPlotNotePhotos(previous => ({
      ...previous,
      ...Object.fromEntries(photoEntries),
    }));
  }, [getPhotosByIds]);

  const fetchNotes = useCallback(async (nextSkip: number, reset = false) => {
    const response = isDateMode
      ? await getProjectNotesByDateService(userId, projectId, date, {
          limit: PAGE_SIZE,
          page: Math.floor(nextSkip / PAGE_SIZE) + 1,
        })
      : await getPlotNoteService(projectId, userId, plotId, {
          limit: PAGE_SIZE,
          skip: nextSkip,
        });

    const payload = response && 'data' in response ? response.data : undefined;
    const allFetchedNotes: PlotNote[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : payload
      ? [payload]
      : [];

    const pagedNotes =
      allFetchedNotes.length > PAGE_SIZE
        ? allFetchedNotes.slice(nextSkip, nextSkip + PAGE_SIZE)
        : allFetchedNotes;

    await loadPlotNotePhotos(pagedNotes);

    setPlotNotes(previous =>
      reset ? sortNotes(pagedNotes) : mergeNotes(previous, pagedNotes),
    );
    setSkip(nextSkip + pagedNotes.length);
    setHasMore(
      allFetchedNotes.length > nextSkip + pagedNotes.length ||
        pagedNotes.length === PAGE_SIZE,
    );
  }, [
    date,
    isDateMode,
    loadPlotNotePhotos,
    mergeNotes,
    plotId,
    projectId,
    sortNotes,
    userId,
  ]);

  const refreshNotes = useCallback(async () => {
    setIsRefreshing(true);

    try {
      setPlotNotePhotos({});
      await fetchNotes(0, true);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }, [fetchNotes]);

  const loadMoreNotes = useCallback(async () => {
    if (isLoadingMore || isInitialLoading || !hasMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      await fetchNotes(skip);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchNotes, hasMore, isInitialLoading, isLoadingMore, skip]);

  useFocusEffect(
    useCallback(() => {
      refreshNotes();
    }, [refreshNotes]),
  );

  const totalNotesByDay = plotNotes.reduce<Record<string, number>>((acc, note) => {
    const label = getDayLabel(note.date || note.createdOfflineAt || note.createdAt);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const listData: NoteListItem[] = [];
  let lastDayLabel = '';

  plotNotes.forEach(note => {
    const dayLabel = getDayLabel(note.date || note.createdOfflineAt || note.createdAt);

    if (dayLabel !== lastDayLabel) {
      listData.push({
        type: 'section',
        key: `section-${dayLabel}`,
        label: dayLabel,
        count: totalNotesByDay[dayLabel] || 0,
      });
      lastDayLabel = dayLabel;
    }

    listData.push({
      type: 'note',
      key: note._id,
      note,
    });
  });

  const openEditor = (note?: PlotNote) => {
    const notePlot = note ? (plotsData as Plot[]).find(plot => plot._id === note.plotId) : undefined;

    navigation.navigate('PlotNoteEditor', {
      projectId,
      plotId: note?.plotId || plotId,
      userId,
      plotColor: notePlot ? getTreatmentColor(notePlot.treatment) : plotColor,
      plotName: notePlot ? getPlotDisplayName(notePlot) : plotName,
      plotIndex: notePlot?.plotIndex || plotIndex,
      note,
    });
  };

  const handleDeleteNote = (note: PlotNote) => {
    Alert.alert(
      'Delete Note',
      'This note will be removed from the plot.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlotNoteService(
              note._id,
              userId,
              projectId,
              note.plotId || plotId,
            );
            await refreshNotes();
          },
        },
      ],
    );
  };

  const renderItem: ListRenderItem<NoteListItem> = ({ item }) => {
    if (item.type === 'section') {
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 8,
            backgroundColor: '#1b212c',
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 4,
          }}
        >
          <CalendarDays size={16} color="#35b164" />
          <Text style={{ color: '#e7ebef', fontSize: 14, fontWeight: '600' }}>
            {item.label}
          </Text>
          <Text style={{ color: '#7b899d', fontSize: 14 }}>
            {`${item.count} ${item.count === 1 ? 'note' : 'notes'}`}
          </Text>
        </View>
      );
    }

    const note = item.note;
    const notePhotos = plotNotePhotos[note._id] || [];
    const contentPreview = getCardPreviewContent(note.content, 2);
    const notePlot = (plotsData as Plot[]).find(plot => plot._id === note.plotId);

    return (
      <Card
        style={{
          backgroundColor: '#171c24',
          borderWidth: 1,
          borderColor: '#232a36',
          borderRadius: 28,
          gap: 18,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isDateMode && notePlot?.plotIndex ? (
              <View
                style={{
                  minWidth: 52,
                  height: 36,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  backgroundColor: getTreatmentColor(notePlot.treatment),
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  {`R${notePlot.plotIndex[0]} T${notePlot.plotIndex[1]}`}
                </Text>
              </View>
            ) : null}
            <FileText size={16} color="#8d98aa" />
            <Text style={{ color: '#8d98aa', fontSize: 14 }}>
              {formatTime(note.createdAt)}
            </Text>
          </View>

          {!!notePhotos.length && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#1c3426',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <ImageIcon size={14} color="#47d16f" />
              <Text style={{ color: '#47d16f', fontSize: 12, fontWeight: '700' }}>
                {notePhotos.length}
              </Text>
            </View>
          )}
        </View>

        {!!note.title?.trim() && (
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
            {note.title}
          </Text>
        )}

        <Text style={{ color: '#e7ebef', fontSize: 16, lineHeight: 28 }}>
          {contentPreview}
        </Text>

        {!!notePhotos.length && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {notePhotos.slice(0, 3).map(photo => (
              <Image
                key={photo.id}
                source={{ uri: `file://${photo.location}` }}
                style={{ width: 110, height: 110, borderRadius: 18 }}
              />
            ))}
          </View>
        )}

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#262d39',
            paddingTop: 10,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => openEditor(note)}
            style={{
              backgroundColor: '#2a313d',
              borderRadius: 18,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 10,
              flex: 1,
            }}
          >
            <PencilLine size={18} color="#e7ebef" />
            <Text style={{ color: '#e7ebef', fontSize: 16, fontWeight: '600' }}>
              Edit Note
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteNote(note)}
            style={{
              width: 56,
              minHeight: 48,
              borderRadius: 18,
              backgroundColor: '#3a1f24',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trash2 size={18} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#101318', paddingHorizontal: 16 }}>
      <View
        style={{
          paddingTop: 20,
          paddingBottom: 20,
          gap: 20,
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
              minWidth: 0,
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
              <ArrowLeft size={22} color="#e7ebef" />
            </TouchableOpacity>

            {!isDateMode && plotIndex ? (
              <View
                style={{
                  minWidth: 54,
                  height: 54,
                  borderRadius: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  flexShrink: 0,
                  backgroundColor: plotColor || '#35b164',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                  {`R${plotIndex[0]} T${plotIndex[1]}`}
                </Text>
              </View>
            ) : null}

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}
              >
                {isDateMode
                  ? plotName || 'Notes by Date'
                  : plotName || `Plot R${plotIndex[0]}_T${plotIndex[1]}`}
              </Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ color: '#7b899d', fontSize: 14 }}
              >
                {isDateMode
                  ? date
                  : `${plotNotes.length} ${plotNotes.length === 1 ? 'note' : 'notes'}`}
              </Text>
            </View>
          </View>

          {!isDateMode && (
            <TouchableOpacity
              onPress={() => openEditor()}
              style={{
                backgroundColor: '#35b164',
                borderRadius: 999,
                minHeight: 52,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <Plus size={20} color="#101318" />
              <Text style={{ color: '#101318', fontSize: 16, fontWeight: '700' }}>
                Add Note
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isInitialLoading ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <ActivityIndicator size="large" color="#35b164" />
          <Text style={{ color: '#7b899d', fontSize: 14 }}>Loading notes...</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          onEndReachedThreshold={0.4}
          onEndReached={loadMoreNotes}
          refreshing={isRefreshing}
          onRefresh={refreshNotes}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: 16,
            paddingBottom: 140,
          }}
          ListEmptyComponent={
            <Card
              style={{
                backgroundColor: '#171c24',
                borderWidth: 1,
                borderColor: '#232a36',
                borderRadius: 28,
              }}
            >
              <Text style={{ color: '#e7ebef', fontSize: 16, fontWeight: '600' }}>
                {isDateMode ? 'No notes for this date' : 'No notes yet'}
              </Text>
              <Text style={{ color: '#7b899d', fontSize: 14, marginTop: 8 }}>
                {isDateMode
                  ? 'No notes were found for the selected date.'
                  : 'Add the first note for this plot to start recording observations.'}
              </Text>
            </Card>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color="#35b164" />
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
};

export default PlotNoteDetailsScreen;
