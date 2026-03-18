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

const AUTH_STORAGE_KEY = "wud.authSession";
const LEGACY_AUTH_STORAGE_KEY = "wud.mockAuth";

function persistAuthSession(accessToken: string | null, user: User | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!accessToken) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ accessToken, user })
  );
}

function loadMockAuthSession(): { accessToken: string | null; user: User | null } {
  if (typeof window === "undefined") {
    return { accessToken: null, user: null };
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    ?? window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
  if (!raw) {
    return { accessToken: null, user: null };
  }

  try {
    const parsed = JSON.parse(raw) as { accessToken?: string; user?: User };
    return {
      accessToken: parsed.accessToken ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    return { accessToken: null, user: null };
  }
}

const { accessToken: initialAccessToken, user: initialUser } = loadMockAuthSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  accessToken: initialAccessToken,
  isAuthenticated: !!initialAccessToken,
  authTransitioning: false,
  setUser: (user) => set((state) => {
    persistAuthSession(state.accessToken, user);
    return { user };
  }),
  setTokens: (accessToken) => {
    set((state) => {
      persistAuthSession(accessToken, state.user);
      return {
        accessToken,
        isAuthenticated: true,
      };
    });
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    }

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      authTransitioning: false,
    });
  },
  setAuthTransitioning: (isTransitioning) => set({ authTransitioning: isTransitioning }),
}));
