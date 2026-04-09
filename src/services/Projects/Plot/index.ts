import axios from 'axios';
import { ProjectLayoutPayload } from '../../../screens/Root/Projects/AddNewProject/Structure/helpers';
import api from '../../api';

export const createPlotsService = async (data: ProjectLayoutPayload) => {
  try {
    const res = await api.post('/projects/plot', data);
    return {
      status: res.status,
      data: res.data,
    };
  } catch (error) {
    console.error('payload', data);
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Something went wrong',
      };
    }

    return {
      status: 500,
      message: 'Unexpected error',
    };
  }
};

export const getPlotNoteService = async (
  projectId: string,
  userId: string,
  plotId: string,
  options?: {
    limit?: number;
    skip?: number;
  },
) => {
  try {
    const res = await api.get('/projects/note', {
      params: {
        projectId,
        userId,
        plotId,
        ...(typeof options?.limit === 'number' ? { limit: options.limit } : {}),
        ...(typeof options?.skip === 'number' ? { skip: options.skip } : {}),
      },
    });
    return {
      status: res.status,
      data: res.data,
    };
  } catch (error) {
    console.error('projectId', projectId);
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Something went wrong',
      };
    }

    return {
      status: 500,
      message: 'Unexpected error',
    };
  }
};

export const addPlotNoteService = async (
  projectId: string,
  plotId: string,
  content: string[],
  userId: string,
  photoIds?: string[],
) => {
  const payload = {
    projectId,
    plotId,
    content,
    userId,
    photoIds,
  };
  try {
    const res = await api.post('/projects/note', payload);
    return {
      status: res.status,
      data: res.data,
    };
  } catch (error) {
    console.error('payload', payload);
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Something went wrong',
      };
    }

    return {
      status: 500,
      message: 'Unexpected error',
    };
  }
};

export const updatePlotNoteService = async (
  projectId: string,
  plotId: string,
  content: string[],
  userId: string,
  noteId?: string,
  photoIds?: string[],
) => {
  const payload = {
    projectId,
    plotId,
    content,
    photoIds,
    userId,
    noteId,
  };
  try {
    const res = await api.patch('/projects/note', payload);
    return {
      status: res.status,
      data: res.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Something went wrong',
      };
    }

    return {
      status: 500,
      message: 'Unexpected error',
    };
  }
};

export const deletePlotNoteService = async (
  noteId: string,
  userId: string,
  projectId: string,
  plotId: string,
) => {
  const payload = {
    _id: noteId,
    userId,
    projectId,
    plotId,
  };

  try {
    const res = await api.delete('/projects/note', {
      data: payload,
    });

    return {
      status: res.status,
      data: res.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Something went wrong',
      };
    }

    return {
      status: 500,
      message: 'Unexpected error',
    };
  }
};

export const getProjectNotesByDateService = async (
  userId: string,
  projectId: string,
  date: string,
  options?: {
    limit?: number;
    page?: number;
  },
) => {
  try {
    const res = await api.get('/projects/note', {
      params: {
        userId,
        projectId,
        date,
        ...(typeof options?.limit === 'number' ? { limit: options.limit } : {}),
        ...(typeof options?.page === 'number' ? { page: options.page } : {}),
      },
    });

    return {
      status: res.status,
      data: res.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Something went wrong',
      };
    }

    return {
      status: 500,
      message: 'Unexpected error',
    };
  }
};
