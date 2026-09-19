import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:3000/" : "https://api.research-pal.com/");
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "researchpal_user";
const DEVICE_ID_KEY = "researchpal_web_device_id";
const TAB_ID_KEY = "researchpal_web_tab_id";

type RetryRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredHandler: (() => void) | null = null;
let accessTokenUpdatedHandler: ((token: string) => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  sessionExpiredHandler = handler;
}

export function setAccessTokenUpdatedHandler(handler: (token: string) => void) {
  accessTokenUpdatedHandler = handler;
}

export function getStoredAccessToken() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { token?: string }).token || null;
  } catch {
    return null;
  }
}

export function getWebDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getWebTabId() {
  let id = sessionStorage.getItem(TAB_ID_KEY);
  if (!id) {
    id = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(TAB_ID_KEY, id);
  }
  return id;
}

function setStoredAccessToken(token: string, refreshToken: string) {
  const raw = localStorage.getItem(USER_KEY);
  const user = raw ? JSON.parse(raw) : {};
  localStorage.setItem(USER_KEY, JSON.stringify({ ...user, token }));
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  accessTokenUpdatedHandler?.(token);
}

function tokenNeedsRefresh(token: string | null) {
  if (!token) return true;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return !payload.exp || payload.exp * 1000 <= Date.now() + 15_000;
  } catch {
    return true;
  }
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

  return (
    data?.error?.message || data?.message || error.message || "Request failed."
  );
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
        const response = await axios.post(`${API_BASE_URL}auth/refresh`, {
          refreshToken,
        });
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
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const url = config.url || "";
  const isAuthRequest =
    url.includes("/auth/login") ||
    url.includes("/auth/sign-in") ||
    url.includes("/auth/signup") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/verify-reset-password") ||
    url.includes("/auth/update-password") ||
    url.includes("/auth/refresh");
  let token = getStoredAccessToken();

  if (
    !isAuthRequest &&
    tokenNeedsRefresh(token) &&
    localStorage.getItem(REFRESH_TOKEN_KEY)
  ) {
    token = await refreshAccessToken();
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Client-Type"] = "web";
  config.headers["X-Device-Id"] = getWebDeviceId();
  config.headers["X-Device-Platform"] = "web";

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
