import { ProjectLayoutPayload } from '../../../screens/Root/Projects/AddNewProject/Structure/helpers';
import { toLocalDateString } from '../../../utils/common';
import api from '../../api';
import { normalizeApiError } from '../../apiError';

const serviceError = (error: unknown) => {
  const parsed = normalizeApiError(error);
  return {
    status: parsed.status || 500,
    message: parsed.message,
  };
};

export const createPlotsService = async (data: ProjectLayoutPayload) => {
  try {
    const res = await api.post('/projects/plot', data);
    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
  }
};

export const updatePlotDisplayMetadataService = async (
  projectId: string,
  plotId: string,
  fields: {
    title?: string;
    replicationName?: string;
    treatmentName?: string;
  },
) => {
  try {
    const res = await api.patch('/projects/plot', {
      _id: plotId,
      projectId,
      ...fields,
    });
    return {
      status: res.status,
      data: res.data?.plot || res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
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
      data: res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
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
    date: toLocalDateString(new Date()),
  };
  try {
    const res = await api.post('/projects/note', payload);
    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
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
      data: res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
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
      data: res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
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
      data: res.data?.data || res.data,
    };
  } catch (error) {
    return serviceError(error);
  }
};
