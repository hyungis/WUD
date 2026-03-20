import { create } from "zustand";
import { starApi } from "../api/star";
import type { DailyPlanet, DeepStar } from "../features/home/utils/homeHelpers";
import { colorFromId } from "../features/home/utils/homeHelpers";

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

type PendingBirth = { targetId: number; kind: "DAILY" | "DEEP" } | null;

type UiState = {
  isLoading: boolean;
  error: string | null;
  isDockHidden: boolean;
  isOverlayOpen: boolean;
  isDailyContentModalOpen: boolean;
  isDailyDetailModalOpen: boolean;
  isDailyCompleteModalOpen: boolean;
  isDailyColoringModalOpen: boolean;
  isWeeklyContentModalOpen: boolean;
  isWeeklyHtpModalOpen: boolean;
  isWeeklyPirModalOpen: boolean;
  isWeeklySwModalOpen: boolean;
  stars: HomeStar[];
  pendingBirth: PendingBirth;
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
  setDailyColoringModalOpen: (isOpen: boolean) => void;
  setWeeklyContentModalOpen: (isOpen: boolean) => void;
  setWeeklyHtpModalOpen: (isOpen: boolean) => void;
  setWeeklyPirModalOpen: (isOpen: boolean) => void;
  setWeeklySwModalOpen: (isOpen: boolean) => void;
  
  // Actions
  setStars: (stars: HomeStar[]) => void;
  fetchStarMap: () => Promise<void>;
  addTemporaryStar: (star: Omit<HomeStar, "id" | "isTemporary">) => void;
  setNewbornStarId: (id: string | null) => void;
  /** 별 생성 대기 등록: fetchStarMap이 새 별을 감지하면 자동으로 newbornStarId 설정 */
  setPendingBirth: (targetId: number, kind: "DAILY" | "DEEP") => void;
  removeStarsByTarget: (targetId: number, kind: "DAILY" | "DEEP") => void;

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
  isDailyColoringModalOpen: false,
  isWeeklyContentModalOpen: false,
  isWeeklyHtpModalOpen: false,
  isWeeklyPirModalOpen: false,
  isWeeklySwModalOpen: false,
  
  globalPhase: "landing",
  stars: [],
  pendingBirth: null,
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
  setDailyColoringModalOpen: (isDailyColoringModalOpen) => set({ isDailyColoringModalOpen }),
  setWeeklyContentModalOpen: (isWeeklyContentModalOpen) => set({ isWeeklyContentModalOpen }),
  setWeeklyHtpModalOpen: (isWeeklyHtpModalOpen) => set({ isWeeklyHtpModalOpen }),
  setWeeklyPirModalOpen: (isWeeklyPirModalOpen) => set({ isWeeklyPirModalOpen }),
  setWeeklySwModalOpen: (isWeeklySwModalOpen) => set({ isWeeklySwModalOpen }),
  
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
        
        const rawTargetId = s.dailyEntryId
          ?? s.daily_entry_id
          ?? s.deepSessionId
          ?? s.deep_session_id
          ?? s.targetId
          ?? s.id;
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
        const TEMP_STAR_TTL_MS = 60_000;
        const now = Date.now();
        const tempStars = state.stars.filter((s) => s.isTemporary);
        const freshTempStars = tempStars.filter((ts) => {
          const createdAt = new Date(ts.createdAt).getTime();
          return Number.isFinite(createdAt) && now - createdAt <= TEMP_STAR_TTL_MS;
        });
        const remainingTemps = tempStars.filter(
          (ts) => freshTempStars.some((fresh) => fresh.id === ts.id)
            && !fetchedStars.some((fs) => fs.targetId === ts.targetId && fs.kind === ts.kind)
        );

        // newbornStarId 동기화: temp → 실제 별 ID 교체
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

        // ★ pendingBirth 감지: 대기 중인 별이 fetchedStars에 나타났으면 탄생 애니메이션 트리거
        let nextPendingBirth = state.pendingBirth;
        let nextSelectedStarId = state.selectedStarId;
        if (state.pendingBirth && !state.newbornStarId) {
          const found = fetchedStars.find(
            s => s.targetId == state.pendingBirth!.targetId && s.kind === state.pendingBirth!.kind
          );
          if (found) {
            nextNewbornId = found.id;
            nextSelectedStarId = found.id;
            nextPendingBirth = null;
          }
        }

        return { 
          stars: [...remainingTemps, ...fetchedStars],
          newbornStarId: nextNewbornId,
          pendingBirth: nextPendingBirth,
          selectedStarId: nextSelectedStarId,
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
      newbornStarId: id,
    }));
  },

  setNewbornStarId: (id) => set({ newbornStarId: id }),

  setPendingBirth: (targetId, kind) => {
    set({ pendingBirth: { targetId, kind } });
  },

  removeStarsByTarget: (targetId, kind) => {
    set((state) => {
      const removedIds = new Set(
        state.stars
          .filter((s) => s.targetId === targetId && s.kind === kind)
          .map((s) => s.id)
      );

      return {
        stars: state.stars.filter((s) => !(s.targetId === targetId && s.kind === kind)),
        selectedStarId: removedIds.has(state.selectedStarId ?? "") ? null : state.selectedStarId,
        newbornStarId: removedIds.has(state.newbornStarId ?? "") ? null : state.newbornStarId,
      };
    });
  },

  setIsMyUniverseOpen: (isMyUniverseOpen) => set({ isMyUniverseOpen }),
  setSelectedStarId: (selectedStarId) => set({ selectedStarId }),
  setHoveredPlanet: (hoveredPlanet) => set({ hoveredPlanet }),
  setSelectedDailyPlanet: (selectedDailyPlanet) => set({ selectedDailyPlanet }),
  setSelectedDeepStar: (selectedDeepStar) => set({ selectedDeepStar }),
}));

// Selector optimization
export const selectHasDeepStarThisWeek = (state: UiState) => {
  return state.stars.some(s => 
    s.kind === "DEEP" && !s.isTemporary
  );
};
