import { useQuickNotesStore } from '../store/notes.store';
import api from './api';
import { normalizeApiError } from './apiError';

const serviceError = (error: unknown) => {
  const parsed = normalizeApiError(error);
  return {
    status: parsed.status || 500,
    message: parsed.message,
  };
};

export async function addQuickNoteService(idea: {
  userId: string;
  date: string;
  idea: string;
}) {
  try {
    const res = await api.post('/ideas', idea);
    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
  }
}

export async function getQuickNotesService(params: {
  userId?: string;
  date?: string;
  limit?: string | number;
  page?: number;
}) {
  try {
    const res = await api.get(`/ideas`, { params });

    if (params.date) {
      useQuickNotesStore.getState().setCurrentDate(params.date);
    }
    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
  }
}

export async function deleteQuickNotes(idea: { userId: string; _id: string }) {
  try {
    const res = await api.delete('/ideas', { data: idea });
    return {
      res,
    };
  } catch (error) {
    return serviceError(error);
  }
}

export async function updateQuickNotes(
  userId: string,
  noteId: string,
  note: string,
) {
  try {
    const res = await api.patch(`/ideas`, { idea: note, userId, _id: noteId });
    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
  }
}
