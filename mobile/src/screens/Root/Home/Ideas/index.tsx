import {
  View,
  ScrollView,
  Pressable,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDateStore } from '../../../../store/date.store';
import {
  H3,
  MutedText,
  TextSecondary,
} from '../../../../components/commonStyles/styles';
import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  X,
} from 'lucide-react-native';
import { Theme } from '../../../../components/theme';
import {
  ActivitiesHeaderContainer,
  MoreOption,
  MoreOptionsCard,
  StyledButton,
} from './styles';
import { QuickNote } from '../../../../store/notes.store';
import {
  addQuickNoteService,
  deleteQuickNotes,
  getQuickNotesService,
  updateQuickNotes,
} from '../../../../services/quickNotes';
import { useAuthStore } from '../../../../store/auth.store';
import { getDayLabel } from '../../../../utils/common';
import { useAddNewButtonActionsStore } from '../../../../store/addNew.store';
import MyModal from '../../../../components/modal';
import CustomCalendar from '../../../../components/Calender';
import { Card } from '../../../../components/Card/styles';
import Input from '../../../../components/Input';
import Button from '../../../../components/Button';
import { useFocusEffect } from '@react-navigation/native';
import { NoteInterface } from '../../Diary';

const Ideas = () => {
  const getUserId = useAuthStore.getState().getUserId;
  const userId = getUserId();

  const today = useDateStore().currentDate;
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [noteAction, setNoteAction] = useState<'add' | 'edit' | null>(null);
  const [menuTop, setMenuTop] = useState<number | null>(null);

  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
  const [draft, setDraft] = useState('');

  const containerRef = useRef<View | null>(null);
  const itemRefs = useRef<Record<string, any>>({});

  const setAddNewButtonVisible = useAddNewButtonActionsStore(
    state => state.setAddNewButtonActionsVisible,
  );
  const setAddNewButtonAction = useAddNewButtonActionsStore(
    state => state.setAddNewButtonAction,
  );

  const fetchNotes = useCallback(async (date: string) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const res = await getQuickNotesService({ userId, date });
      setNotes(res?.data?.userIdeas || []);
    } catch {
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setAddNewButtonVisible(true);
  }, [setAddNewButtonVisible]);

  useEffect(() => {
    fetchNotes(currentDate);
    setOpenMenuId(null);
  }, [currentDate, fetchNotes]);

  useFocusEffect(
    useCallback(() => {
      setAddNewButtonAction(() => setNoteAction('add'));
    }, [setAddNewButtonAction]),
  );

  useEffect(() => {
    const onBackPress = () => {
      if (openMenuId) {
        setOpenMenuId(null);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [openMenuId]);

  const changeDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    const formatted = d.toISOString().split('T')[0];
    setCurrentDate(formatted);
  };

  const openMenuForNote = async (noteId: string) => {
    const itemRef = itemRefs.current[noteId];
    const container = containerRef.current;
    if (!itemRef || !container) {
      // fallback: open menu at top
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
          // cast to any because ref type is View | null
          (container as any).measureInWindow(
            (x: number, y: number, width: number, height: number) =>
              resolve({ x, y, width, height }),
          ),
      );

    try {
      const itemLayout = await measureItem();
      const containerLayout = await measureContainer();
      // compute top relative to container, place menu below the card
      const topRelativeToContainer =
        itemLayout.y - containerLayout.y + itemLayout.height;
      setMenuTop(topRelativeToContainer);
      setOpenMenuId(noteId);
    } catch {
      // fallback
      setMenuTop(0);
      setOpenMenuId(noteId);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setIsSubmitting(true);
    if (noteAction === 'add') {
      await addQuickNoteService({
        userId,
        idea: draft,
        date: selectedDate,
      });

      // ðŸ”¥ Sync screen with newly added note date
      setCurrentDate(selectedDate);
    }

    if (noteAction === 'edit' && editingNote) {
      await updateQuickNotes(userId, editingNote._id, draft);

      // ðŸ”¥ Refresh currently visible date
      fetchNotes(currentDate);
    }

    setDraft('');
    setEditingNote(null);
    setNoteAction(null);
    setIsSubmitting(false);
  };

  const handleDelete = async (note: QuickNote) => {
    if (!userId) return;
    setIsSubmitting(true);
    await deleteQuickNotes({ userId, _id: note._id });
    fetchNotes(currentDate);
    setIsSubmitting(false);
  };

  const handleEdit = (note: NoteInterface) => {
    setEditingNote(note);
    setDraft(note.idea);
    setNoteAction('edit');
    setOpenMenuId(null);
  };

  return (
    <View style={{ flex: 1, gap: 16 }}>
      <ActivitiesHeaderContainer>
        <StyledButton onPress={() => changeDate(-1)}>
          <ChevronLeft size={16} color={Theme.colors.mutedForeground} />
        </StyledButton>

        <H3>Ideas from {getDayLabel(currentDate)}</H3>

        <StyledButton onPress={() => changeDate(1)}>
          <ChevronRight size={16} color={Theme.colors.mutedForeground} />
        </StyledButton>
      </ActivitiesHeaderContainer>

      {/* Wrap ScrollView + overlays so we can measure relative positions */}
      <View style={{ flex: 1 }} ref={containerRef}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <MutedText>Loading...</MutedText>
          ) : notes.length === 0 ? (
            <MutedText>No Notes Found on {currentDate}</MutedText>
          ) : (
            notes.map(note => (
              <View
                key={note._id}
                // attach ref so we can measure this card when ellipsis is pressed
                ref={r => {
                  if (r) {
                    itemRefs.current[note._id] = r;
                  } else {
                    delete itemRefs.current[note._id];
                  }
                }}
              >
                <Card style={{ marginBottom: 12 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <TextSecondary numberOfLines={2}>{note.idea}</TextSecondary>

                    <Pressable
                      onPress={() => openMenuForNote(note._id)}
                      style={{ padding: 4 }}
                    >
                      <EllipsisVertical size={12} color="#fff" />
                    </Pressable>
                  </View>
                </Card>
              </View>
            ))
          )}
        </ScrollView>

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
                  top: menuTop - 20, // small visual offset for spacing (ok)
                  zIndex: 3,
                  elevation: 10,
                }}
              >
                <MoreOptionsCard>
                  <MoreOption
                    onPress={() => {
                      handleEdit(note as NoteInterface);
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
        visible={noteAction !== null}
        onClose={() => setNoteAction(null)}
        placement="bottom"
      >
        <View style={{ gap: 16 }}>
          {noteAction === 'add' && (
            <CustomCalendar
              selectedDate={selectedDate}
              onDayPress={d => setSelectedDate(d.dateString)}
            />
          )}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <H3>Quick Idea</H3>
            <TouchableWithoutFeedback onPress={() => setNoteAction(null)}>
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
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <MutedText>{draft.length}/200</MutedText>
            <Button variant="rounded" onPress={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </View>
        </View>
      </MyModal>
    </View>
  );
};

export default Ideas;
