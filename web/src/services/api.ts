import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://research-pal.com/api/";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "researchpal_user";

type RetryRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  sessionExpiredHandler = handler;
}

function getStoredAccessToken() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { token?: string }).token || null;
  } catch {
    return null;
  }
}

function setStoredAccessToken(token: string, refreshToken: string) {
  const raw = localStorage.getItem(USER_KEY);
  const user = raw ? JSON.parse(raw) : {};
  localStorage.setItem(USER_KEY, JSON.stringify({ ...user, token }));
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearStoredSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionExpiredHandler?.();
}

function apiMessage(error: AxiosError) {
  const data = error.response?.data as
    | { error?: { message?: string }; message?: string }
    | undefined;

  return data?.error?.message || data?.message || error.message || "Request failed.";
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        clearStoredSession();
        return null;
      }

      try {
        const response = await axios.post(`${API_BASE_URL}auth/refresh`, { refreshToken });
        const responseData = response.data?.data || response.data;
        const nextAccessToken = responseData.accessToken || responseData.token;
        const nextRefreshToken = responseData.refreshToken;

        if (!nextAccessToken || !nextRefreshToken) {
          clearStoredSession();
          return null;
        }

        setStoredAccessToken(nextAccessToken, nextRefreshToken);
        return nextAccessToken;
      } catch {
        clearStoredSession();
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url || "";

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !url.includes("auth/login") &&
      !url.includes("auth/sign-in") &&
      !url.includes("auth/refresh")
    ) {
      originalRequest._retry = true;
      const accessToken = await refreshAccessToken();

      if (accessToken) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(new Error(apiMessage(error)));
  },
);
