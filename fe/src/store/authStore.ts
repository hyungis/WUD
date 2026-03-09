import { create } from "zustand";
import { tokenStorage } from "../utils/tokenStorage";

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

const initialAccessToken = tokenStorage.getAccessToken();
const initialRefreshToken = tokenStorage.getRefreshToken();

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  isAuthenticated: !!initialAccessToken,
  setUser: (user) => set({ user }),
  setTokens: (accessToken, refreshToken) => {
    tokenStorage.setAccessToken(accessToken);
    if (refreshToken) {
      tokenStorage.setRefreshToken(refreshToken);
    }
    set({
      accessToken,
      refreshToken: refreshToken ?? tokenStorage.getRefreshToken(),
      isAuthenticated: true,
    });
  },
  clearAuth: () => {
    tokenStorage.clear();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
