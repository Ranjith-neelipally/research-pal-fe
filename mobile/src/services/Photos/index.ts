import api from '../api';
import { normalizeApiError } from '../apiError';

export const getAllPhotoIds = async (userId: string) => {
  try {
    const res = await api.get('/projects/photos', {
      params: {
        userId,
      },
    });
    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    const parsed = normalizeApiError(error);
    return {
      status: parsed.status || 500,
      message: parsed.message,
    };
  }
};

export const getPhotoDetails = async (photoId: string, userId: string) => {
  try {
    const res = await api.get(`/photos/`, {
      params: {
        photoId,
        userId,
      },
    });
    return {
      status: res.status,
      data: res.data?.data || res.data,
    };
  } catch (error) {
    const parsed = normalizeApiError(error);
    return {
      status: parsed.status || 500,
      message: parsed.message,
    };
  }
};
