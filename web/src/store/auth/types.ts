export type AuthStatus = "idle" | "loading" | "succeeded" | "failed";

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  verified: boolean;
  token: string;
  createdAt?: string;
}

export interface PendingVerification {
  userId: string;
  verificationToken: string;
}

export interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  pendingVerification: PendingVerification | null;
}

export interface AuthResponse {
  profile: {
    id: string;
    name: string;
    verified: boolean;
    projects?: string[];
    email: string;
    createdAt?: string;
  };
  accessToken?: string;
  refreshToken: string;
  token?: string;
}

export interface SignupResponse {
  user_id: string;
  verificationToken: string;
}
