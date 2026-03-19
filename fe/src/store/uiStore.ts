import { create } from "zustand";
import { starApi } from "../api/star";
import type { DailyPlanet, DeepStar } from "../features/home/utils/homeHelpers";
import { colorFromId, getWeekKey } from "../features/home/utils/homeHelpers";

export type HomeStar = {
  id: string;
  targetId?: number;
  constellationId?: number;
  kind: "DAILY" | "DEEP";
  createdAt: string;
  weekStartDate?: string;
  color: string;
  isTemporary?: boolean;
};

type UiState = {
  isLoading: boolean;
  error: string | null;
  isDockHidden: boolean;
  isOverlayOpen: boolean;
  isDailyContentModalOpen: boolean;
  isDailyDetailModalOpen: boolean;
  isDailyCompleteModalOpen: boolean;
  isWeeklyContentModalOpen: boolean;
  isWeeklyHtpModalOpen: boolean;
  stars: HomeStar[];
  isPolling: boolean;
  newbornStarId: string | null;

  // UI 상태 필드들
  globalPhase: "landing" | "login" | "dashboard" | "success";
  selectedStarId: string | null;
  hoveredPlanet: { id: string; x: number; y: number } | null;
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
  setWeeklyContentModalOpen: (isOpen: boolean) => void;
  setWeeklyHtpModalOpen: (isOpen: boolean) => void;
  
  // 추가된 Setter들
  // Actions
  setStars: (stars: HomeStar[]) => void;
  fetchStarMap: () => Promise<void>;
  addTemporaryStar: (star: Omit<HomeStar, "id" | "isTemporary">) => void;
  setNewbornStarId: (id: string | null) => void;
  refreshStarsAfterSave: (newTargetId: number, kind: "DAILY" | "DEEP") => void;

  setGlobalPhase: (phase: "landing" | "login" | "dashboard" | "success") => void;
  setIsMyUniverseOpen: (open: boolean) => void;
  setSelectedStarId: (id: string | null) => void;
  setHoveredPlanet: (planet: { id: string; x: number; y: number } | null) => void;
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
  isWeeklyContentModalOpen: false,
  isWeeklyHtpModalOpen: false,
  
  globalPhase: "landing",
  stars: [],
  isPolling: false,
  newbornStarId: null,
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
  setWeeklyContentModalOpen: (isWeeklyContentModalOpen) => set({ isWeeklyContentModalOpen }),
  setWeeklyHtpModalOpen: (isWeeklyHtpModalOpen) => set({ isWeeklyHtpModalOpen }),
  
  setGlobalPhase: (globalPhase) => set({ globalPhase }),
  setStars: (stars) => set({ stars }),

  fetchStarMap: async () => {
    try {
      const res = await starApi.getStarMap();
      if (!res.success) return;

      const payload = res.data as any;
      const rawStars = Array.isArray(payload?.stars)
        ? payload.stars
        : Array.isArray(payload)
          ? payload
          : Array.isArray((payload as any)?.data?.stars)
            ? (payload as any).data.stars
            : [];

      const fetchedStars: HomeStar[] = rawStars.map((s: any) => {
        const id = String(s.starId ?? s.id ?? s.dailyEntryId ?? s.targetId ?? "");
        const kindRaw = String(s.kind ?? s.starKind ?? s.type ?? "DAILY").toUpperCase();
        const kind = (kindRaw === "DEEP" || kindRaw === "HTP" || kindRaw.includes("DEEP") ? "DEEP" : "DAILY") as "DAILY" | "DEEP";
        const createdAtRaw = s.createdAt ?? s.created_at ?? s.timestamp ?? s.weekStartDate;
        const createdAt = createdAtRaw ? String(createdAtRaw) : new Date().toISOString();
        const weekStartDate = s.weekStartDate ?? s.week_start_date;
        
        // targetId: 폴링 시 비교를 위해 사용. 백엔드 필드명(dailyEntryId, id 등)에 맞춰 정규화
        const rawTargetId = s.dailyEntryId ?? s.targetId ?? s.id;
        const targetId = typeof rawTargetId === "number" ? rawTargetId : Number(rawTargetId);

        const constellationId = typeof s.constellationId === "number" ? s.constellationId : Number(s.constellationId);
        return {
          id,
          targetId: Number.isNaN(targetId) ? undefined : targetId,
          constellationId: Number.isNaN(constellationId) ? undefined : constellationId,
          kind,
          createdAt,
          weekStartDate,
          color: s.starColor || colorFromId(id, kind),
        } as HomeStar;
      }).filter((s: HomeStar) => s.id);

      set((state) => {
        const tempStars = state.stars.filter((s) => s.isTemporary);
        // 아직 fetch 결과에 포함되지 않은 임시 별만 유지
        const remainingTemps = tempStars.filter(
          (ts) => !fetchedStars.some((fs) => fs.targetId === ts.targetId && fs.kind === ts.kind)
        );

        // 🚨 [수정] newbornStarId 동기화: 만약 제거될 임시 별이 newbornStarId였다면, 새 별의 ID로 교체해줌
        let nextNewbornId = state.newbornStarId;
        if (state.newbornStarId && state.newbornStarId.startsWith("temp-")) {
          const matchedTemp = tempStars.find(ts => ts.id === state.newbornStarId);
          if (matchedTemp) {
            const matchedFetched = fetchedStars.find(fs => fs.targetId === matchedTemp.targetId && fs.kind === matchedTemp.kind);
            if (matchedFetched) {
              nextNewbornId = matchedFetched.id;
            }
          }
        }

        return { 
          stars: [...remainingTemps, ...fetchedStars],
          newbornStarId: nextNewbornId
        };
      });
    } catch (e) {
      console.error("fetchStarMap fail:", e);
    }
  },

  addTemporaryStar: (starData) => {
    const id = `temp-${Date.now()}`;
    const tempStar: HomeStar = {
      ...starData,
      id,
      isTemporary: true,
    };
    set((state) => ({ 
      stars: [tempStar, ...state.stars],
      newbornStarId: id // 새로운 별이 탄생했음을 알림
    }));
  },

  setNewbornStarId: (id) => set({ newbornStarId: id }),

  refreshStarsAfterSave: (newTargetId, kind) => {
    const { isPolling, fetchStarMap } = useUiStore.getState();
    if (isPolling) return;

    set({ isPolling: true });
    
    let attempts = 0;
    const maxAttempts = 5;
    const delays = [2000, 5000, 10000, 15000, 20000];

    const poll = async () => {
      await fetchStarMap();
      const currentStars = useUiStore.getState().stars;
      // targetId 비교 시 number/string 차이 방지 위해 == 사용
      const found = currentStars.find(s => s.targetId == newTargetId && s.kind === kind);

      if (found || attempts >= maxAttempts) {
        if (found) {
          set({ isPolling: false, newbornStarId: found.id });
        } else {
          set({ isPolling: false });
        }
        return;
      }

      setTimeout(() => {
        attempts++;
        poll();
      }, delays[attempts] || 5000);
    };

    poll();
  },

  setIsMyUniverseOpen: (isMyUniverseOpen) => set({ isMyUniverseOpen }),
  setSelectedStarId: (selectedStarId) => set({ selectedStarId }),
  setHoveredPlanet: (hoveredPlanet) => set({ hoveredPlanet }),
  setSelectedDailyPlanet: (selectedDailyPlanet) => set({ selectedDailyPlanet }),
  setSelectedDeepStar: (selectedDeepStar) => set({ selectedDeepStar }),
}));

// Selector optimization
export const selectHasDeepStarThisWeek = (state: UiState) => {
  const now = new Date();
  const currentWeekKey = getWeekKey(now);
  
  return state.stars.some(s => 
    s.kind === "DEEP" && 
    (s.weekStartDate ? getWeekKey(new Date(s.weekStartDate)) === currentWeekKey : getWeekKey(new Date(s.createdAt)) === currentWeekKey)
  );
};
