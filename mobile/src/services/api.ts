import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeApiError } from './apiError';
import { Platform } from 'react-native';
import { cancelAllIdeaReminders } from './ideaReminders';
import { clearSecureCredentials, getSecureCredentials, setSecureCredentials } from './secureCredentials';

const DEV_API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/'
  : 'http://localhost:3000/';

export const API_BASE_URL = __DEV__
  ? DEV_API_BASE_URL
  : 'https://api.research-pal.com/';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ACCESS_TOKEN_KEY = 'access_token';
const DEVICE_ID_KEY = 'research_pal_device_id';
export const SESSION_ID_KEY = 'session_id';

const authDebug = (message: string, details?: Record<string, unknown>) => {
  if (__DEV__) console.log(`[auth] ${message}`, details || '');
};

export const getDeviceIdentity = async () => {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  const constants = Platform.constants as Record<string, any>;
  const model = Platform.OS === 'android'
    ? constants.Model || constants.Brand || 'Android device'
    : constants.interfaceIdiom === 'pad' ? 'iPad' : 'iPhone';
  const osVersion = String(constants.Release || constants.osVersion || Platform.Version);
  return { id, model, platform: Platform.OS, osVersion };
};

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
    const device = await getDeviceIdentity();
    config.headers['X-Device-Id'] = device.id;
    config.headers['X-Device-Model'] = device.model;
    config.headers['X-Device-Platform'] = device.platform;
    config.headers['X-Device-Os-Version'] = device.osVersion;
    config.headers['X-Client-Type'] = 'mobile';

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
  await cancelAllIdeaReminders();
  await clearSecureCredentials();
  await AsyncStorage.removeMany([
    REFRESH_TOKEN_KEY,
    ACCESS_TOKEN_KEY,
    SESSION_ID_KEY,
    '_id',
    'username',
    'verified',
    'email',
  ]);
  await useAuthStore.getState().clearUser();
};

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storedCredentials = await getSecureCredentials();
      const refreshToken = storedCredentials?.refreshToken;
      authDebug('refresh token loaded', { found: Boolean(refreshToken) });

      if (!refreshToken) {
        return null;
      }

      try {
        authDebug('refresh attempt started');
        const response = await axios.post(`${API_BASE_URL}auth/refresh`, {
          refreshToken,
        }, {
          headers: { 'X-Client-Type': 'mobile' },
        });
        const responseData = response.data?.data || response.data;
        const nextAccessToken = responseData.accessToken || responseData.token;
        const nextRefreshToken = responseData.refreshToken;
        const sessionId = responseData.sessionId;

        if (!nextAccessToken || !nextRefreshToken) {
          authDebug('refresh response missing credentials');
          return null;
        }

        await setSecureCredentials({
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
          sessionId: sessionId || storedCredentials?.sessionId,
        });
        await AsyncStorage.removeMany([REFRESH_TOKEN_KEY, ACCESS_TOKEN_KEY, SESSION_ID_KEY]);
        useAuthStore.getState().setAccessToken(nextAccessToken);
        authDebug('refresh completed', {
          accessTokenReceived: true,
          refreshTokenPersisted: true,
          sessionIdPersisted: Boolean(sessionId),
        });
        return nextAccessToken;
      } catch (error: any) {
        const status = Number(error?.response?.status || error?.status || 0);
        authDebug('refresh failed', { status: status || 'network' });
        if (status === 401 || status === 403) {
          await clearSession();
        }
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
      !url.includes('auth/forgot-password') &&
      !url.includes('auth/verify-reset-password') &&
      !url.includes('auth/update-password') &&
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
