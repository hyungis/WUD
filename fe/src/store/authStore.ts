import { create } from "zustand";

export type User = {
  id?: string;
  email?: string;
  name?: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  authTransitioning: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string) => void;
  clearAuth: () => void;
  setAuthTransitioning: (isTransitioning: boolean) => void;
};

const initialAccessToken = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: initialAccessToken,
  isAuthenticated: !!initialAccessToken,
  authTransitioning: false,
  setUser: (user) => set({ user }),
  setTokens: (accessToken) => {
    set({
      accessToken,
      isAuthenticated: true,
    });
  },
  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      authTransitioning: false,
    });
  },
  setAuthTransitioning: (isTransitioning) => set({ authTransitioning: isTransitioning }),
}));
