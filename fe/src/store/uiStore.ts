import { create } from "zustand";

type UiState = {
  isLoading: boolean;
  error: string | null;
  isDockHidden: boolean;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setDockHidden: (isHidden: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isLoading: false,
  error: null,
  isDockHidden: false,
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setDockHidden: (isDockHidden) => set({ isDockHidden }),
}));
