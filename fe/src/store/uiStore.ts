import { create } from "zustand";
import type { StarItem } from "../types/star";
import type { DailyPlanet, DeepStar } from "../features/home/utils/homeHelpers";

type UiState = {
  isLoading: boolean;
  error: string | null;
  isDockHidden: boolean;
  isOverlayOpen: boolean;
  isDailyContentModalOpen: boolean;
  isDailyDetailModalOpen: boolean;
  isDailyCompleteModalOpen: boolean;
  
  // 추가된 필드들
  globalPhase: "landing" | "login" | "dashboard" | "success";
  stars: StarItem[];
  selectedStarId: string | number | null;
  hoveredPlanet: { id: string | number; x: number; y: number } | null;
  isMyUniverseOpen: boolean;
  selectedDailyPlanet: DailyPlanet | null;
  selectedDeepStar: DeepStar | null;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setDockHidden: (isHidden: boolean) => void;
  setOverlayOpen: (isOpen: boolean) => void;
  setDailyContentModalOpen: (isOpen: boolean) => void;
  setDailyDetailModalOpen: (isOpen: boolean) => void;
  setDailyCompleteModalOpen: (isOpen: boolean) => void;
  
  // 추가된 Setter들
  setGlobalPhase: (phase: "landing" | "login" | "dashboard" | "success") => void;
  setStars: (stars: StarItem[]) => void;
  setIsMyUniverseOpen: (open: boolean) => void;
  setSelectedStarId: (id: string | number | null) => void;
  setHoveredPlanet: (planet: { id: string | number; x: number; y: number } | null) => void;
  setSelectedDailyPlanet: (planet: DailyPlanet | null) => void;
  setSelectedDeepStar: (star: DeepStar | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isLoading: false,
  error: null,
  isDockHidden: false,
  isOverlayOpen: false,
  isDailyContentModalOpen: false,
  isDailyDetailModalOpen: false,
  isDailyCompleteModalOpen: false,
  
  globalPhase: "landing",
  stars: [],
  selectedStarId: null,
  hoveredPlanet: null,
  isMyUniverseOpen: false,
  selectedDailyPlanet: null,
  selectedDeepStar: null,

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setDockHidden: (isDockHidden) => set({ isDockHidden }),
  setOverlayOpen: (isOverlayOpen) => set({ isOverlayOpen }),
  setDailyContentModalOpen: (isDailyContentModalOpen) => set({ isDailyContentModalOpen }),
  setDailyDetailModalOpen: (isDailyDetailModalOpen) => set({ isDailyDetailModalOpen }),
  setDailyCompleteModalOpen: (isDailyCompleteModalOpen) => set({ isDailyCompleteModalOpen }),
  
  setGlobalPhase: (globalPhase) => set({ globalPhase }),
  setStars: (stars) => set({ stars }),
  setIsMyUniverseOpen: (isMyUniverseOpen) => set({ isMyUniverseOpen }),
  setSelectedStarId: (selectedStarId) => set({ selectedStarId }),
  setHoveredPlanet: (hoveredPlanet) => set({ hoveredPlanet }),
  setSelectedDailyPlanet: (selectedDailyPlanet) => set({ selectedDailyPlanet }),
  setSelectedDeepStar: (selectedDeepStar) => set({ selectedDeepStar }),
}));
