import axios from 'axios';
import api from '../api';

export const getAllPhotoIds = async (userId: string) => {
  try {
    const res = await api.get('/projects/photos', {
      params: {
        userId,
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
