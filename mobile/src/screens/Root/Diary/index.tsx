import {
  View,
  ScrollView,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  H1,
  H3,
  MutedText,
  Screen,
  TextSecondary,
} from '../../../components/commonStyles/styles';
import {
  addQuickNoteService,
  deleteQuickNotes,
  getQuickNotesService,
  updateQuickNotes,
} from '../../../services/quickNotes';
import { useAuthStore } from '../../../store/auth.store';
import { Card } from '../../../components/Card/styles';
import {
  EllipsisVertical,
  PlusCircle,
  RefreshCcw,
  X,
} from 'lucide-react-native';
import CustomCalendar from '../../../components/Calender';
import Input from '../../../components/Input';
import MyModal from '../../../components/modal';
import { Theme } from '../../../components/theme';
import Button from '../../../components/Button';
import { useDateStore } from '../../../store/date.store';
import { MoreOptionsCard, MoreOption } from '../Home/Ideas/styles';
import { useFocusEffect } from '@react-navigation/native';
import { useAddNewButtonActionsStore } from '../../../store/addNew.store';
import ScreenHeader from '../../../components/ScreenHeader';

export interface NoteInterface {
  _id: string;
  userId: string;
  idea: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

const Diary = () => {
  const PAGE_SIZE = 15;
  const userId = useAuthStore(state => state.user?._id);
  const today = useDateStore().currentDate;
  const setAddNewButtonAction = useAddNewButtonActionsStore(
    state => state.setAddNewButtonAction,
  );

  const [notes, setNotes] = useState<NoteInterface[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [action, setAction] = useState<'add' | 'edit' | null>(null);
  const [draft, setDraft] = useState('');
  const [editingNote, setEditingNote] = useState<NoteInterface | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const containerRef = useRef<View | null>(null);
  const itemRefs = useRef<Record<string, any>>({});

  const handleAddButtonAction = () => {
    setAction('add');
  };

  const fetchNotes = useCallback(
    async (pageToLoad = 1, force = false) => {
      if (!userId) return;

      // 🔥 Allow forced fetch (used after add/edit/reset)
      if (!force && (isFetchingMore || !hasMore)) return;

      if (pageToLoad === 1) {
        setIsLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      try {
        const res = await getQuickNotesService({
          userId,
          page: pageToLoad,
        });

        const newNotes: NoteInterface[] = res?.data?.userIdeas || [];

        setNotes(prev =>
          pageToLoad === 1 ? newNotes : [...prev, ...newNotes],
        );

        setHasMore(newNotes.length === PAGE_SIZE);
        setPage(pageToLoad);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [PAGE_SIZE, hasMore, isFetchingMore, userId],
  );

  const resetAndFetch = () => {
    setPage(1);
    setHasMore(true);
    setNotes([]);

    fetchNotes(1, true);
  };

  useLayoutEffect(() => {
    fetchNotes(1);
  }, [fetchNotes]);

  useFocusEffect(
    React.useCallback(() => {
      setAddNewButtonAction(handleAddButtonAction);
    }, [setAddNewButtonAction]),
  );

  const handleSave = async () => {
    if (!userId || !selectedDate) return;

    setIsSubmitting(true);
    if (action === 'add') {
      await addQuickNoteService({
        userId,
        idea: draft,
        date: selectedDate,
      });

      // 🔥 reset pagination so newest note appears
      resetAndFetch();
    }

    if (action === 'edit' && editingNote) {
      await updateQuickNotes(userId, editingNote._id, draft);

      // 🔥 refresh page 1 forcefully
      fetchNotes(1, true);
    }

    setDraft('');
    setEditingNote(null);
    setAction(null);
    setIsSubmitting(false);
  };

  const handleEdit = (note: NoteInterface) => {
    setEditingNote(note);
    setDraft(note.idea);
    setAction('edit');
    setOpenMenuId(null);
  };

  const handleDelete = async (note: NoteInterface) => {
    if (!userId) return;
    setIsLoading(true);
    await deleteQuickNotes({ userId, _id: note._id });
    setIsLoading(false);
    fetchNotes();
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const getDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const currentDay = new Date();

    const yesterday = new Date(currentDay);
    yesterday.setDate(currentDay.getDate() - 1);

    const tomorrow = new Date(currentDay);
    tomorrow.setDate(currentDay.getDate() + 1);

    if (isSameDay(date, currentDay)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    if (isSameDay(date, tomorrow)) return 'Tomorrow';

    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const groupNotesByDate = (items: NoteInterface[]) => {
    return items.reduce<Record<string, NoteInterface[]>>((acc, note) => {
      const label = getDateLabel(note.date);

      if (!acc[label]) {
        acc[label] = [];
      }

      acc[label].push(note);

      return acc;
    }, {});
  };

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const groupedNotes = groupNotesByDate(sortedNotes);

  const openMenuForNote = async (noteId: string) => {
    const itemRef = itemRefs.current[noteId];
    if (!itemRef || !containerRef.current) {
      setMenuTop(0);
      setOpenMenuId(noteId);
      return;
    }

    const measureItem = () =>
      new Promise<{ x: number; y: number; width: number; height: number }>(
        resolve =>
          itemRef.measureInWindow(
            (x: number, y: number, width: number, height: number) =>
              resolve({ x, y, width, height }),
          ),
      );

    const measureContainer = () =>
      new Promise<{ x: number; y: number; width: number; height: number }>(
        resolve =>
          (containerRef.current as any).measureInWindow(
            (x: number, y: number, width: number, height: number) =>
              resolve({ x, y, width, height }),
          ),
      );

    try {
      const itemLayout = await measureItem();
      const containerLayout = await measureContainer();

      const topRelativeToContainer =
        itemLayout.y - containerLayout.y + itemLayout.height;

      setMenuTop(topRelativeToContainer);
      setOpenMenuId(noteId);
    } catch {
      setMenuTop(0);
      setOpenMenuId(noteId);
    }
  };

  const getNoteTimestamp = (note: { createdAt: string; updatedAt: string }) => {
    const created = new Date(note.createdAt);
    const updated = new Date(note.updatedAt);

    const isUpdated = updated.getTime() > created.getTime();

    const finalDate = isUpdated ? updated : created;
    const label = !isUpdated ? (
      <PlusCircle color={Theme.colors.mutedForeground} size={14} />
    ) : (
      <RefreshCcw color={Theme.colors.mutedForeground} size={14} />
    );

    const formattedDate = finalDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const formattedTime = finalDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 4,
        }}
      >
        {label}
        <MutedText>
          {formattedDate} · {formattedTime}
        </MutedText>
      </View>
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Diary" subtitle="Daily research journal" />

      <View style={{ flex: 1 }} ref={containerRef}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;

            const isNearBottom =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 30;

            if (isNearBottom) {
              fetchNotes(page + 1);
            }
          }}
          scrollEventThrottle={16}
        >
          {isLoading ? (
            <MutedText style={{ textAlign: 'center', marginVertical: 12 }}>
              Loading notes...
            </MutedText>
          ) : (
            Object.entries(groupedNotes).map(([dateLabel, dateNotes]) => (
              <View key={dateLabel} style={{ marginBottom: 20 }}>
                <MutedText style={{ marginBottom: 8 }}>{dateLabel}</MutedText>

                {dateNotes.map(note => (
                  <View
                    key={note._id}
                    ref={r => {
                      if (r) {
                        itemRefs.current[note._id] = r;
                      } else {
                        delete itemRefs.current[note._id];
                      }
                    }}
                  >
                    <Card style={{ marginBottom: 10 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <View
                          style={{ flex: 1, flexDirection: 'column', gap: 4 }}
                        >
                          <TextSecondary style={{ flex: 1 }}>
                            {note.idea}
                          </TextSecondary>
                          <MutedText>{getNoteTimestamp(note)}</MutedText>
                        </View>

                        <Pressable
                          onPress={() => {
                            openMenuForNote(note._id);
                          }}
                          style={{ padding: 4 }}
                        >
                          <EllipsisVertical size={14} color="#fff" />
                        </Pressable>
                      </View>
                    </Card>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
        {isFetchingMore && (
          <MutedText style={{ textAlign: 'center', marginVertical: 12 }}>
            Loading more...
          </MutedText>
        )}

        {openMenuId && (
          <Pressable
            onPress={() => setOpenMenuId(null)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
            }}
          />
        )}

        {openMenuId !== null &&
          menuTop !== null &&
          (() => {
            const note = notes.find(n => n._id === openMenuId);
            if (!note) return null;

            return (
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: menuTop - 20,
                  zIndex: 3,
                  elevation: 10,
                }}
              >
                <MoreOptionsCard>
                  <MoreOption
                    onPress={() => {
                      handleEdit(note);
                      setOpenMenuId(null);
                    }}
                  >
                    <MutedText>Edit</MutedText>
                  </MoreOption>

                  <MoreOption
                    onPress={() => {
                      handleDelete(note);
                      setOpenMenuId(null);
                    }}
                  >
                    <MutedText>Delete</MutedText>
                  </MoreOption>
                </MoreOptionsCard>
              </View>
            );
          })()}
      </View>

      <MyModal
        visible={action !== null}
        onClose={() => setAction(null)}
        placement="bottom"
      >
        <View style={{ gap: 16 }}>
          {action === 'add' && (
            <CustomCalendar
              selectedDate={selectedDate ?? undefined}
              onDayPress={d => setSelectedDate(d.dateString)}
            />
          )}
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <H3>Quick Idea</H3>
            <TouchableWithoutFeedback onPress={() => setAction(null)}>
              <X size={16} color={Theme.colors.mutedForeground} />
            </TouchableWithoutFeedback>
          </View>
          <Input
            placeholder="Capture your thought..."
            numberOfLines={3}
            value={draft}
            onChangeText={setDraft}
          />
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <MutedText>{draft.length}/200</MutedText>
            <Button
              variant="rounded"
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </View>
        </View>
      </MyModal>
    </Screen>
  );
};

export default Diary;
