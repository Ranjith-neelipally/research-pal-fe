import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeApiError } from './apiError';

// const API_BASE_URL = 'http://10.252.212.6:1430/';
const API_BASE_URL = 'https://api.research-pal.com/';
const REFRESH_TOKEN_KEY = 'refresh_token';

let refreshPromise: Promise<string | null> | null = null;

// Create an instance of Axios
const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  async (config: any) => {
    if (!config.headers) {
      config.headers = {};
    }
    const user = useAuthStore.getState().getUser();
    const tokenData = user?.token;

    if (tokenData) {
      config.headers.Authorization = `Bearer ${tokenData}`;
    }
    return config;
  },
  error => {
    // Handle request errors
    return Promise.reject(error);
  },
);

const clearSession = async () => {
  await AsyncStorage.multiRemove([
    REFRESH_TOKEN_KEY,
    '_id',
    'username',
    'verified',
    'email',
  ]);
  await useAuthStore.getState().clearUser();
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        await clearSession();
        return null;
      }

      try {
        const response = await axios.post(`${API_BASE_URL}auth/refresh`, {
          refreshToken,
        });
        const responseData = response.data?.data || response.data;
        const nextAccessToken = responseData.accessToken || responseData.token;
        const nextRefreshToken = responseData.refreshToken;

        if (!nextAccessToken || !nextRefreshToken) {
          await clearSession();
          return null;
        }

        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
        useAuthStore.getState().setAccessToken(nextAccessToken);
        return nextAccessToken;
      } catch (error) {
        await clearSession();
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !url.includes('auth/login') &&
      !url.includes('auth/sign-in') &&
      !url.includes('auth/refresh')
    ) {
      originalRequest._retry = true;
      const accessToken = await refreshAccessToken();

      if (accessToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

export default api;
