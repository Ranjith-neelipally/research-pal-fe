import { create } from 'zustand';

export interface NoteCreatedEvent {
  id: number;
  projectId: string;
  plotId: string;
  date: string;
}

interface NoteEventsState {
  lastCreatedNote?: NoteCreatedEvent;
  notifyNoteCreated: (event: Omit<NoteCreatedEvent, 'id'>) => void;
}

let nextEventId = 1;

export const useNoteEventsStore = create<NoteEventsState>(set => ({
  notifyNoteCreated: event => set({
    lastCreatedNote: {
      ...event,
      id: nextEventId++,
    },
  }),
}));
