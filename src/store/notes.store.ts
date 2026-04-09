import { create } from 'zustand';

export interface QuickNote {
  _id: string;
  userId: string;
  idea: string;
  createdAt: string;
  updatedAt: string;
  date: string;
}

export interface QuickNotesState {
  quickNotes: QuickNote[];
  addQuickNote: (note: QuickNote) => void;
  setQuickNotes: (notes: QuickNote[]) => void;
  setCurrentDate: (date: string) => void;
  currentDate?: string;
}

export const useQuickNotesStore = create<QuickNotesState>(set => ({
  quickNotes: [],
  currentDate: new Date().toISOString().split('T')[0],
  addQuickNote: note =>
    set(state => ({ quickNotes: [...state.quickNotes, note] })),
  setQuickNotes: notes => set({ quickNotes: notes }),
  setCurrentDate: date => set(() => ({ currentDate: date })),
}));
