import type { AuthUser, PendingVerification } from "@/store/auth/types";

export const REFRESH_TOKEN_KEY = "refresh_token";
export const USER_KEY = "researchpal_user";
export const TEMP_USER_ID_KEY = "temp_user_id";
export const VERIFICATION_TOKEN_KEY = "verification_token";

export function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function readPendingVerification(): PendingVerification | null {
  const userId = localStorage.getItem(TEMP_USER_ID_KEY);
  const verificationToken = localStorage.getItem(VERIFICATION_TOKEN_KEY);

  return userId && verificationToken ? { userId, verificationToken } : null;
}

export function persistSession(user: AuthUser, refreshToken: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function persistVerificationSession(userId: string, verificationToken: string) {
  localStorage.setItem(TEMP_USER_ID_KEY, userId);
  localStorage.setItem(VERIFICATION_TOKEN_KEY, verificationToken);
}

export function clearVerificationSession() {
  localStorage.removeItem(TEMP_USER_ID_KEY);
  localStorage.removeItem(VERIFICATION_TOKEN_KEY);
}

export function clearStoredSession() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearVerificationSession();
}
