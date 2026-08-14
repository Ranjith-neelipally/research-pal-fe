import {
  View,
  ScrollView,
  Pressable,
  BackHandler,
} from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  H3,
  MutedText,
  TextSecondary,
} from '../../../../components/commonStyles/styles';
import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
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
  deleteQuickNotes,
  getQuickNotesService,
} from '../../../../services/quickNotes';
import { useAuthStore } from '../../../../store/auth.store';
import { useAddNewButtonActionsStore } from '../../../../store/addNew.store';
import { Card } from '../../../../components/Card/styles';
import { useFocusEffect } from '@react-navigation/native';
import { NoteInterface } from '../../Diary';
import QuickIdeaEditor from '../../../../components/QuickIdeaEditor';
import { cancelIdeaReminders } from '../../../../services/ideaReminders';

interface IdeasProps {
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
}

const parseLocalDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const toLocalDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getIdeasHeading = (selectedDate: string) => {
  const selected = parseLocalDate(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const difference = Math.round((selected.getTime() - today.getTime()) / 86400000);

  if (difference === 0) return 'Ideas from Today';
  if (difference === -1) return 'Ideas from Yesterday';
  if (difference === 1) return 'Ideas for Tomorrow';

  const label = selected.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return difference < 0 ? `Ideas from ${label}` : `Ideas for ${label}`;
};

const Ideas = ({ selectedDate, onSelectedDateChange }: IdeasProps) => {
  const getUserId = useAuthStore.getState().getUserId;
  const userId = getUserId();

  const [isLoading, setIsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [noteAction, setNoteAction] = useState<'add' | 'edit' | null>(null);
  const [menuTop, setMenuTop] = useState<number | null>(null);

  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);

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
    fetchNotes(selectedDate);
    setOpenMenuId(null);
  }, [selectedDate, fetchNotes]);

  useFocusEffect(
    useCallback(() => {
      setAddNewButtonAction(() => setNoteAction('add'));
      fetchNotes(selectedDate);
    }, [fetchNotes, selectedDate, setAddNewButtonAction]),
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
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + days);
    onSelectedDateChange(toLocalDateString(d));
  };

  const openMenuForNote = async (noteId: string, pageY?: number) => {
    const itemRef = itemRefs.current[noteId];
    const container = containerRef.current;
    if (container && pageY !== undefined && Number.isFinite(pageY)) {
      (container as any).measureInWindow(
        (_x: number, containerY: number) => {
          const relativeTop = pageY - containerY + 16;
          setMenuTop(Number.isFinite(relativeTop) ? Math.max(0, relativeTop) : 0);
          setOpenMenuId(noteId);
        },
      );
      return;
    }
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
      setMenuTop(
        Number.isFinite(topRelativeToContainer)
          ? Math.max(0, topRelativeToContainer)
          : 0,
      );
      setOpenMenuId(noteId);
    } catch {
      // fallback
      setMenuTop(0);
      setOpenMenuId(noteId);
    }
  };

  const handleDelete = async (note: QuickNote) => {
    if (!userId) return;
    await cancelIdeaReminders(note._id);
    await deleteQuickNotes({ userId, _id: note._id });
    fetchNotes(selectedDate);
  };

  const handleEdit = (note: NoteInterface) => {
    setEditingNote(note);
    setNoteAction('edit');
    setOpenMenuId(null);
  };

  return (
    <View style={{ flex: 1, gap: 16 }}>
      <ActivitiesHeaderContainer>
        <StyledButton onPress={() => changeDate(-1)}>
          <ChevronLeft size={16} color={Theme.colors.mutedForeground} />
        </StyledButton>

        <H3>{getIdeasHeading(selectedDate)}</H3>

        <StyledButton onPress={() => changeDate(1)}>
          <ChevronRight size={16} color={Theme.colors.mutedForeground} />
        </StyledButton>
      </ActivitiesHeaderContainer>

      {/* Wrap ScrollView + overlays so we can measure relative positions */}
      <View style={{ flex: 1 }} ref={containerRef}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 150 }}
          onScrollBeginDrag={() => setOpenMenuId(null)}
        >
          {isLoading ? (
            <MutedText>Loading...</MutedText>
          ) : notes.length === 0 ? (
            <MutedText>No ideas found for this date</MutedText>
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
                      onPress={event => openMenuForNote(note._id, event.nativeEvent.pageY)}
                      style={{ padding: 4 }}
                    >
                      <EllipsisVertical size={12} color="#fff" />
                    </Pressable>
                  </View>
                </Card>
                {openMenuId === note._id && (
                  <View style={{ position: 'absolute', right: 8, top: 32, zIndex: 20, elevation: 20 }}>
                    <MoreOptionsCard>
                      <MoreOption onPress={() => handleEdit(note as NoteInterface)}><MutedText>Edit</MutedText></MoreOption>
                      <MoreOption onPress={() => { handleDelete(note); setOpenMenuId(null); }}><MutedText>Delete</MutedText></MoreOption>
                    </MoreOptionsCard>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {false && openMenuId && (
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

        {false && openMenuId !== null &&
          menuTop !== null &&
          Number.isFinite(menuTop) &&
          (() => {
            const note = notes.find(n => n._id === openMenuId);
            if (!note) return null;

            return (
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: Math.max(0, menuTop - 20),
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

      {userId && <QuickIdeaEditor visible={noteAction !== null} userId={userId} initialDate={selectedDate} note={noteAction === 'edit' ? editingNote : null} onClose={() => { setNoteAction(null); setEditingNote(null); }} onSaved={saved => {
        if (!saved || saved.date === selectedDate) {
          fetchNotes(selectedDate);
          return;
        }
        onSelectedDateChange(saved.date);
      }} />}
    </View>
  );
};

export default Ideas;
