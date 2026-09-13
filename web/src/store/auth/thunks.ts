import { createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/services/api";
import type { RootState } from "@/store";
import type { AuthResponse, AuthUser, SignupResponse } from "@/store/auth/types";
import {
  REFRESH_TOKEN_KEY,
  clearStoredSession,
  clearVerificationSession,
  persistSession,
  persistVerificationSession,
  readStoredUser,
  TEMP_USER_ID_KEY,
  VERIFICATION_TOKEN_KEY,
} from "@/store/auth/storage";
import { normalizeError, unwrapData } from "@/store/auth/utils";

export const login = createAsyncThunk<
  AuthUser,
  { email: string; password: string },
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post("/auth/login", credentials);
    const responseData = unwrapData<AuthResponse>(response.data);
    const accessToken = responseData.accessToken || responseData.token || "";

    const user: AuthUser = {
      _id: responseData.profile.id,
      username: responseData.profile.name || "",
      email: responseData.profile.email,
      verified: responseData.profile.verified,
      token: accessToken,
      createdAt: responseData.profile.createdAt,
    };

    persistSession(user, responseData.refreshToken);
    return user;
  } catch (error) {
    return rejectWithValue(normalizeError(error));
  }
});

export const signup = createAsyncThunk<
  { userId: string; verificationToken: string },
  { email: string; password: string; userName: string },
  { rejectValue: string }
>("auth/signup", async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post("/auth/signup", payload);
    const responseData = unwrapData<SignupResponse>(response.data);
    const userId = responseData.user_id;
    const verificationToken = responseData.verificationToken;

    persistVerificationSession(userId, verificationToken);

    return { userId, verificationToken };
  } catch (error) {
    return rejectWithValue(normalizeError(error));
  }
});

export const verifyEmail = createAsyncThunk<void, { code: string }, { rejectValue: string; state: RootState }>(
  "auth/verifyEmail",
  async ({ code }, { getState, rejectWithValue }) => {
    try {
      const pending = getState().auth.pendingVerification;
      const userId = pending?.userId || localStorage.getItem(TEMP_USER_ID_KEY);
      const verificationToken =
        pending?.verificationToken || localStorage.getItem(VERIFICATION_TOKEN_KEY);

      if (!userId || !verificationToken) {
        throw new Error("Verification session not found. Please sign up again.");
      }

      await api.post("/auth/verify-email", {
        userId,
        code,
        verificationToken,
      });

      clearVerificationSession();
    } catch (error) {
      return rejectWithValue(normalizeError(error));
    }
  },
);

export const refreshSession = createAsyncThunk<AuthUser | null, void, { rejectValue: string }>(
  "auth/refreshSession",
  async (_, { rejectWithValue }) => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const storedUser = readStoredUser();

    if (!refreshToken || !storedUser) return null;

    try {
      const response = await api.post("/auth/refresh", { refreshToken });
      const responseData = unwrapData<Omit<AuthResponse, "profile">>(response.data);
      const accessToken = responseData.accessToken || responseData.token || "";
      const nextRefreshToken = responseData.refreshToken;
      const nextUser = { ...storedUser, token: accessToken };

      persistSession(nextUser, nextRefreshToken);
      return nextUser;
    } catch (error) {
      clearStoredSession();
      return rejectWithValue(normalizeError(error));
    }
  },
);

export const forgotPassword = createAsyncThunk<void, { email: string }, { rejectValue: string }>(
  "auth/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      await api.post("/auth/forgot-password", { email });
    } catch (error) {
      return rejectWithValue(normalizeError(error));
    }
  },
);

export const verifyResetPassword = createAsyncThunk<void, { token: string }, { rejectValue: string }>(
  "auth/verifyResetPassword",
  async ({ token }, { rejectWithValue }) => {
    try {
      await api.post("/auth/verify-reset-password", { token });
    } catch (error) {
      return rejectWithValue(normalizeError(error));
    }
  },
);

export const updatePassword = createAsyncThunk<void, { token: string; password: string }, { rejectValue: string }>(
  "auth/updatePassword",
  async ({ token, password }, { rejectWithValue }) => {
    try {
      await api.post("/auth/update-password", { token, password });
    } catch (error) {
      return rejectWithValue(normalizeError(error));
    }
  },
);

export const logout = createAsyncThunk<void, { fromAll?: boolean } | undefined, { state: RootState }>(
  "auth/logout",
  async (payload, { getState }) => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const token = getState().auth.user?.token;

    try {
      if (token) {
        await api.post(
          "/auth/logout",
          { refreshToken },
          { params: payload?.fromAll ? { fromAll: "yes" } : undefined },
        );
      }
    } finally {
      clearStoredSession();
    }
  },
);
