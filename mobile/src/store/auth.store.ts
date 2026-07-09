import { create } from 'zustand';

interface User {
  _id: string;
  username: string;
  email: string;
  verified: boolean;
  token: string;
}

interface AuthState {
  user: User | null;
  projectId: string | null;
  isHydrated: boolean;

  // Getters
  getUser: () => User | null;
  getUserId: () => string | null;
  getProjectId: () => string | null;

  // Setters
  setUser: (user: User) => Promise<void>;
  setAccessToken: (token: string) => void;
  setProjectId: (projectId: string) => Promise<void>;
  clearUser: () => Promise<void>;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  projectId: null,
  isHydrated: false,

  setHydrated: (value: boolean) => set({ isHydrated: value }),

  getUser: () => get().user,
  getUserId: () => get().user?._id || null,
  getProjectId: () => get().projectId,

  setUser: async (user: User) => {
    set({ user });
  },

  setAccessToken: (token: string) => {
    const user = get().user;
    if (user) {
      set({ user: { ...user, token } });
    }
  },

  setProjectId: async (projectId: string) => {
    set({ projectId });
  },

  clearUser: async () => {
    set({ user: null, projectId: null });
  },
}));
