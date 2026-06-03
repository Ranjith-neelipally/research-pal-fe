import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { USER_KEY, clearStoredSession, readPendingVerification, readStoredUser } from "@/store/auth/storage";
import type { AuthState } from "@/store/auth/types";
import { forgotPassword, login, logout, refreshSession, signup, verifyEmail } from "@/store/auth/thunks";

const initialState: AuthState = {
  user: readStoredUser(),
  status: "idle",
  error: null,
  pendingVerification: readPendingVerification(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.token = action.payload;
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      }
    },
    clearSession(state) {
      state.user = null;
      state.error = null;
      state.status = "idle";
      clearStoredSession();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Unable to sign in.";
      })
      .addCase(signup.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.pendingVerification = action.payload;
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Unable to create account.";
      })
      .addCase(verifyEmail.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.status = "succeeded";
        state.pendingVerification = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Unable to verify email.";
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(refreshSession.rejected, (state) => {
        state.user = null;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Unable to request password reset.";
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      });
  },
});

export const { clearSession, setAccessToken } = authSlice.actions;

export default authSlice.reducer;
