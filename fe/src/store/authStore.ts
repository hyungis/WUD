import { create } from "zustand";

export type User = {
  id?: string;
  email?: string;
  name?: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
};

const initialAccessToken = null;
const initialRefreshToken = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  isAuthenticated: !!initialAccessToken,
  setUser: (user) => set({ user }),
  setTokens: (accessToken, refreshToken) => {
    set({
      accessToken,
      refreshToken: refreshToken ?? null,
      isAuthenticated: true,
    });
  },
  clearAuth: () => {
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
