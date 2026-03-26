import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { dailyApi } from "../../api/daily";
import { deepApi } from "../../api/deep";
import type { DailyPlanet, DeepStar } from "./utils/homeHelpers";
import { getSundayWeekKey, normalizeDeepReportText, colorFromId } from "./utils/homeHelpers";
import { StarScene } from "./components/scene/StarScene";
import { useUiStore } from "../../store/uiStore";
import { getApiErrorMessage } from "../../utils/apiError";

import { MyUniverseModal } from "./components/modals/MyUniverseModal";
import { TimelineHUD } from "./components/ui/TimelineHUD";
import { StarSidePanel } from "./components/ui/StarSidePanel";
import DailyContentSelector from "../daily/components/DailyContentSelector";
import DailyDetailView from "../daily/DailyDetailView";
import DailyColoringView from "../daily/DailyColoringView";
import DailyFreeDrawView from "../daily/DailyFreeDrawView";
import DailyCompleteView from "../daily/DailyCompleteView";
import WeeklyContentView from "../deep/WeeklyContentView";
import WeeklyHtpView from "../deep/WeeklyHtpView";
import WeeklySingleDrawView from "../deep/WeeklySingleDrawView";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuthStore } from "../../store/authStore";
import { useCustomStarStore } from "../../store/customStarStore";
import { userApi } from "../../api/user";

// ==========================================
// 5. 메인 페이지 (UI)
// ==========================================

function HomePage() {
  const user = useAuthStore((state) => state.user);
  const authTransitioning = useAuthStore((state) => state.authTransitioning);
  const isMyUniverseOpen = useUiStore((state) => state.isMyUniverseOpen);
  const setIsMyUniverseOpen = useUiStore((state) => state.setIsMyUniverseOpen);
  const [selectedDeepStar, setSelectedDeepStar] = useState<any>(null);
  const [deepPages, setDeepPages] = useState<any[]>([]);
  const [selectedDailyPlanet, setSelectedDailyPlanet] = useState<DailyPlanet | null>(null);
  const [isStarSceneReady, setIsStarSceneReady] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [reportOrigin, setReportOrigin] = useState<"mypage" | "scene" | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null);
  const [analysisReady, setAnalysisReady] = useState(false);
  const stars = useUiStore((state) => state.stars);
  const fetchStarMap = useUiStore((state) => state.fetchStarMap);
  const addTemporaryStar = useUiStore((state) => state.addTemporaryStar);
  const removeStarsByTarget = useUiStore((state) => state.removeStarsByTarget);
  const selectedStarId = useUiStore((state) => state.selectedStarId);
  const setSelectedStarId = useUiStore((state) => state.setSelectedStarId);
  const newbornStarId = useUiStore((state) => state.newbornStarId);
  const setNewbornStarId = useUiStore((state) => state.setNewbornStarId);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<{ id: string; x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<"macro" | "micro">("micro");
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const timelineFocusNonce = useUiStore((state) => state.timelineFocusNonce);
  const setTimelineFocusNonce = useUiStore((state) => state.incrementTimelineFocusNonce);
  const setDockHidden = useUiStore((state) => state.setDockHidden);
  const setOverlayOpen = useUiStore((state) => state.setOverlayOpen);
  const isDailyContentModalOpen = useUiStore((state) => state.isDailyContentModalOpen);
  const setDailyContentModalOpen = useUiStore((state) => state.setDailyContentModalOpen);
  const isDailyDetailModalOpen = useUiStore((state) => state.isDailyDetailModalOpen);
  const setDailyDetailModalOpen = useUiStore((state) => state.setDailyDetailModalOpen);
  const isDailyCompleteModalOpen = useUiStore((state) => state.isDailyCompleteModalOpen);
  const setDailyCompleteModalOpen = useUiStore((state) => state.setDailyCompleteModalOpen);
  const isDailyColoringModalOpen = useUiStore((state) => state.isDailyColoringModalOpen);
  const setDailyColoringModalOpen = useUiStore((state) => state.setDailyColoringModalOpen);
  const isDailyFreeDrawModalOpen = useUiStore((state) => state.isDailyFreeDrawModalOpen);
  const setDailyFreeDrawModalOpen = useUiStore((state) => state.setDailyFreeDrawModalOpen);
  const isWeeklyContentModalOpen = useUiStore((state) => state.isWeeklyContentModalOpen);
  const setWeeklyContentModalOpen = useUiStore((state) => state.setWeeklyContentModalOpen);
  const isWeeklyHtpModalOpen = useUiStore((state) => state.isWeeklyHtpModalOpen);
  const setWeeklyHtpModalOpen = useUiStore((state) => state.setWeeklyHtpModalOpen);
  const isWeeklyPirModalOpen = useUiStore((state) => state.isWeeklyPirModalOpen);
  const setWeeklyPirModalOpen = useUiStore((state) => state.setWeeklyPirModalOpen);
  const isWeeklySwModalOpen = useUiStore((state) => state.isWeeklySwModalOpen);
  const setWeeklySwModalOpen = useUiStore((state) => state.setWeeklySwModalOpen);
  const isCinematicMode = useUiStore((state) => state.isCinematicMode);
  const setIsCinematicMode = useUiStore((state) => state.setIsCinematicMode);

  const isMacro = viewMode === "macro";
  const hoverClearTimerRef = useRef<number | null>(null);
  const isTooltipHoverRef = useRef(false);
  const pendingBirthReport = useRef<any>(null);
  const pendingBirthKind = useRef<"daily" | "deep" | null>(null);
  const openDeepReportRef = useRef<((payload: any) => void) | null>(null);
  const openDailyReportRef = useRef<((payload: any) => void) | null>(null);

  useEffect(() => {
    const overlayOpen = isMyUniverseOpen
      || isDailyContentModalOpen
      || isDailyDetailModalOpen
      || isDailyCompleteModalOpen
      || isDailyColoringModalOpen
      || isDailyFreeDrawModalOpen
      || isWeeklyContentModalOpen
      || isWeeklyHtpModalOpen
      || isWeeklyPirModalOpen
      || isWeeklySwModalOpen
      || isSidePanelOpen;
    setOverlayOpen(overlayOpen);
    return () => setOverlayOpen(false);
  }, [
    isMyUniverseOpen,
    isDailyContentModalOpen,
    isDailyDetailModalOpen,
    isDailyCompleteModalOpen,
    isDailyColoringModalOpen,
    isDailyFreeDrawModalOpen,
    isWeeklyContentModalOpen,
    isWeeklyHtpModalOpen,
    isWeeklyPirModalOpen,
    isWeeklySwModalOpen,
    isSidePanelOpen,
    setOverlayOpen,
    isCinematicMode,
    setIsCinematicMode,
  ]);

  useEffect(() => {
    // 리포트 패널이 열리면 하단 플로팅 도크를 즉시 숨긴다.
    if (isSidePanelOpen) {
      setDockHidden(true);
      return;
    }

    // 패널이 닫히면 Dock 표시 제어는 씬(zoom 로직)에 맡긴다.
    setDockHidden(false);
  }, [isSidePanelOpen, setDockHidden]);

  const mypageStar = useMemo(() => ({
    id: "center-mypage-star",
    createdAt: new Date().toISOString(),
    toneColor: "#f8fafc",
    label: "나의 중심",
  }), []);

  const normalizeWeekKey = (weekStartDate?: string, createdAt?: string) => {
    if (weekStartDate && /^\d{4}-S\d{4}$/.test(weekStartDate)) return weekStartDate;

    const primary = weekStartDate ? new Date(weekStartDate) : null;
    if (primary && !Number.isNaN(primary.getTime())) return getSundayWeekKey(primary);

    const fallback = createdAt ? new Date(createdAt) : null;
    if (fallback && !Number.isNaN(fallback.getTime())) return getSundayWeekKey(fallback);

    return "";
  };

  const timelineItems = useMemo(() => {
    return stars.map((s) => ({
      id: s.id,
      kind: (s.kind || "daily").toLowerCase(),
      color: s.color,
      label: s.kind === "DAILY" ? "DAILY PLANET" : "WEEKLY PLANET",
      weekKey: s.kind === "DEEP"
        ? normalizeWeekKey(s.weekStartDate, s.createdAt)
        : getSundayWeekKey(new Date(s.createdAt)),
      createdAt: s.createdAt,
      original: s,
    }));
  }, [stars]);

  // 컴포넌트 로드 시 지도(별) 및 중심별 설정 조회
  useEffect(() => {
    void fetchStarMap().catch((e) => {
      console.error("fetch star map fail:", e);
    });
    // 중심별 정보도 유저별로 다르므로 마운트 시 강제 동기화
    void useCustomStarStore.getState().fetchCenterStar();
  }, [fetchStarMap]);

  // localStorage 캐시 없이도 새로고침 시 최신 상태를 유지하기 위해 주기적으로 서버에서 재조회한다.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchStarMap().catch((e) => {
        console.error("periodic fetch star map fail:", e);
      });
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchStarMap]);

  // 새로운 별이 생성되었을 때 자동 선택 + 카메라 포커스
  // newbornStarId 클리어는 StarBirthEffect의 onBirthComplete에서 처리
  useEffect(() => {
    if (newbornStarId) {
      setSelectedStarId(newbornStarId);
      setTimelineFocusNonce();
    }
  }, [newbornStarId, setSelectedStarId]);

  // ==========================================
  // 코치마크 (튜토리얼) 로직
  // ==========================================
  const handleStartTutorial = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: "다음",
      prevBtnText: "이전",
      doneBtnText: "완료",
      steps: [
        {
          element: "#center-star-anchor",
          popover: {
            title: "나의 중심",
            description: "당신의 감정이 모여 이곳에 특별한 별들이 태어납니다. 우주드로우에 오신 것을 환영해요!",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#timeline-hud-container",
          popover: {
            title: "타임라인",
            description: "그동안 기록한 소중한 감정의 별들을 주차별로 한눈에 확인할 수 있습니다.",
            side: "left",
            align: "end",
          },
        },
        {
          element: "#daily-star-btn",
          popover: {
            title: "데일리 기록",
            description: "오늘의 감정을 간단한 그림과 함께 남기고 싶을 때 클릭해 보세요.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#weekly-star-btn",
          popover: {
            title: "위클리 기록",
            description: "한 주를 마무리하며 더 깊은 감정 분석이 필요할 땐 위클리 컨텐츠를 해보세요. 별자리가 완성됩니다! ",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#mypage-btn",
          popover: {
            title: "나의 우주 (마이페이지)",
            description: "기록 데이터 확인부터 별 커스터마이징, 계정 설정까지 마이페이지에서 한 번에 관리해 보세요.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#re-tutorial-btn",
          popover: {
            title: "튜토리얼 다시보기",
            description: "도움이 필요할 땐 언제든 이 버튼을 눌러 가이드를 다시 볼 수 있습니다.",
            side: "top",
            align: "center",
          },
        },
      ],
      onDestroyed: () => {
        // 코치마크 종료 시 무조건 백엔드에 완료 상태 전송 및 스토어 업데이트
        userApi.completeTutorial().catch((e) => console.error("튜토리얼 완료 처리 실패:", e));
        localStorage.removeItem("showTutorial"); // 튜토리얼이 완료되거나 닫힐 때만 삭제
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.tutorialCompleted !== true) {
          useAuthStore.getState().setUser({ ...currentUser, tutorialCompleted: true });
        }
      },
    });
    driverObj.drive();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const initTutorial = async () => {
      // 1. 로그인 전환 중이거나 3D 씬이 아직 준비되지 않았으면 대기
      if (authTransitioning || !isStarSceneReady) return;

      const showTutorialParam = localStorage.getItem("showTutorial");

      // 🚨 이미 완료한 유저라면 로컬스토리지 플래그 강제 삭제 (중복 방지)
      if (user?.tutorialCompleted === true && showTutorialParam) {
        localStorage.removeItem("showTutorial");
      }

      // 서버 상태가 false인 경우에만 튜토리얼 대상으로 판단
      const needsTutorial = (user?.tutorialCompleted === false);

      if (needsTutorial) {
        // 2. 요소들이 나타날 때까지 비동기적으로 대기 (최대 5초)
        let attempts = 0;
        while (attempts < 10 && !isCancelled) {
          const anchor = document.getElementById("center-star-anchor");
          const dailyBtn = document.getElementById("daily-star-btn");
          const timeline = document.getElementById("timeline-hud-container");

          if (anchor && dailyBtn && timeline) break;

          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }

        if (!isCancelled) {
          handleStartTutorial();
        }
      }
    };

    void initTutorial();
    return () => { isCancelled = true; };
  }, [user?.tutorialCompleted, authTransitioning, isStarSceneReady, handleStartTutorial]);

  const dailyPlanets = useMemo(
    () => stars
      .filter(s => s.kind === "DAILY")
      .map((s) => ({
        id: s.id,
        targetId: s.targetId,
        shell: s.color,
        core: s.color,
        memo: "",
        createdAt: s.createdAt,
        isTemporary: s.isTemporary,
      })),
    [stars],
  );

  const deepStars = useMemo(
    () => stars
      .filter(s => s.kind === "DEEP")
      .map((s) => ({
        id: s.id,
        targetId: s.targetId,
        constellationId: s.constellationId,
        toneColor: s.color,
        createdAt: s.createdAt,
        weekKey: normalizeWeekKey(s.weekStartDate, s.createdAt) || undefined,
        label: s.isTemporary ? "분석 중..." : "WEEKLY PLANET",
        isTemporary: s.isTemporary,
      })),
    [stars],
  );

  const openDeepReport = async (
    star: DeepStar & { targetId?: number; aiSummary?: string; questions?: string[]; deepType?: string },
    options?: { silent?: boolean; source?: "mypage" | "scene" },
  ) => {
    if (options?.source === "mypage") {
      const sessionIdNum = Number(star.targetId ?? star.id);
      const matchedStar = stars.find(s => s.kind === "DEEP" && s.targetId === sessionIdNum);
      setSelectedStarId(matchedStar?.id ?? star.id);
      setTimelineFocusNonce();
    }
    setReportError(null);
    setSelectedDeepStar(star);
    setSelectedDailyPlanet(null);
    setIsSidePanelOpen(true);

    const sessionId = Number(star.targetId ?? star.id);
    if (Number.isNaN(sessionId) || sessionId <= 0) {
      setReportError("위클리 리포트 ID가 유효하지 않습니다.");
      return;
    }

    const silent = Boolean(options?.silent);
    if (!silent) {
      setReportOrigin(options?.source ?? "scene");
    }
    if (!silent) {
      setReportLoading(true);
    }
    try {
      // 클릭한 별의 세션과 같은 주(week)의 세션들만 모아서 탭으로 구성
      const sessionsRes = await deepApi.getPastSessions();
      const allSessions = sessionsRes.success && Array.isArray(sessionsRes.data) ? sessionsRes.data : [];

      // 클릭한 별의 weekKey 기준으로 같은 주 세션만 필터
      const targetWeekKey = star.weekKey;
      const sameWeekSessions = targetWeekKey
        ? allSessions.filter((s: any) => {
            if (s.status === "DRAFT" || s.status === "FAILED") return false;
            const sWeekKey = normalizeWeekKey(undefined, s.createdAt);
            return sWeekKey === targetWeekKey;
          })
        : [];

      // deepType별로 같은 주 내 최신 세션 1개씩
      const byType = new Map<string, any>();
      for (const s of sameWeekSessions) {
        const existing = byType.get(s.deepType);
        if (!existing || new Date(s.createdAt) > new Date(existing.createdAt)) {
          byType.set(s.deepType, s);
        }
      }
      const weekSessions = Array.from(byType.values());

      // 대상 세션은 새로고침 없이도 반드시 리포트 페이지 목록에 포함
      const targetDeepType = (star as any).deepType;
      const targetSession = allSessions.find((s: any) => Number(s.sessionId) === sessionId);
      const targetExists = weekSessions.some((s: any) => Number(s.sessionId) === sessionId);
      if (!targetExists) {
        weekSessions.push(
          targetSession || {
            sessionId,
            deepType: targetDeepType || "HTP",
            status: "ANALYZING",
            createdAt: star.createdAt,
          },
        );
      }

      // 최소 대상 세션은 포함
      if (weekSessions.length === 0) {
        weekSessions.push({ sessionId, deepType: "HTP", status: "DONE", createdAt: star.createdAt });
      }

      // 병렬로 결과 조회
      const results = await Promise.allSettled(
        weekSessions.map((s: any) => deepApi.getDeepResult(s.sessionId))
      );

      const TYPE_ORDER: Record<string, number> = { HTP: 0, PERSON_IN_RAIN: 1, STAR_WAVE: 2 };
      const pages: any[] = [];

      weekSessions.forEach((session: any, i: number) => {
        const result = results[i];
        if (result.status === "fulfilled" && result.value.success && result.value.data) {
          const data = result.value.data;
          pages.push({
            sessionId: session.sessionId,
            deepType: data.deepType || session.deepType || "HTP",
            aiSummary: normalizeDeepReportText(data.aiResult?.result || data.aiResult?.resultSummary || ""),
            submissions: Array.isArray(data.submissions) ? data.submissions : [],
            psychAssessments: Array.isArray(data.psychAssessments) ? data.psychAssessments : [],
            status: data.status || session.status,
            createdAt: session.createdAt,
          });
        } else {
          const normalizedStatus = session.status === "DONE" || session.status === "FAILED"
            ? session.status
            : "ANALYZING";
          pages.push({
            sessionId: session.sessionId,
            deepType: session.deepType || "HTP",
            aiSummary: "",
            submissions: [],
            psychAssessments: [],
            status: normalizedStatus,
            createdAt: session.createdAt,
          });
        }
      });

      pages.sort((a, b) => (TYPE_ORDER[a.deepType] ?? 99) - (TYPE_ORDER[b.deepType] ?? 99));
      setDeepPages(pages);

      // 헤더용으로 대표 세션 데이터 설정
      const primary = pages.find(p => p.sessionId === sessionId) || pages[0];
      if (primary) {
        setSelectedDeepStar((prev: any) => ({
          ...prev,
          aiSummary: primary.aiSummary,
          submissions: primary.submissions,
          psychAssessments: primary.psychAssessments,
          deepType: primary.deepType,
          status: primary.status,
        }));
      }
    } catch (e) {
      console.error("fetch deep result fail:", e);
      setReportError(getApiErrorMessage(e, "위클리 리포트를 불러오지 못했습니다."));
    } finally {
      if (!silent) {
        setReportLoading(false);
      }
    }
  };

  // 별 탄생 파티클 애니메이션 완료 시 newborn 상태 해제 + 리포트 오픈 (데일리/위클리 동일)
  openDeepReportRef.current = openDeepReport;
  const handleBirthComplete = useCallback(() => {
    setNewbornStarId(null);
    setAnalysisReady(false);
    if (pendingBirthReport.current) {
      const payload = pendingBirthReport.current;
      const kind = pendingBirthKind.current;
      pendingBirthReport.current = null;
      pendingBirthKind.current = null;
      if (kind === "daily") {
        openDailyReportRef.current?.(payload);
      } else {
        openDeepReportRef.current?.(payload);
      }
    }
  }, [setNewbornStarId]);

  // 분석 완료 폴링: pendingSessionId(위클리)가 있으면 8초마다 결과 조회, DONE이면 별가루 모으기 시작
  useEffect(() => {
    if (!pendingSessionId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await deepApi.getAnalysisStatus(pendingSessionId);
        if (cancelled) return;
        if (res.success && res.data && res.data.status === "DONE") {
          setPendingSessionId(null);
          setAnalysisReady(true);
        } else if (res.success && res.data && res.data.status === "FAILED") {
          setPendingSessionId(null);
          setAnalysisReady(false);
          pendingBirthReport.current = null;
        }
      } catch { /* retry next interval */ }
    };
    void poll();
    const id = window.setInterval(poll, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [pendingSessionId]);

  // 분석 완료 폴링: pendingDailyId(데일리)가 있으면 5초마다 결과 조회, DONE이면 별가루 모으기
  const [pendingDailyId, setPendingDailyId] = useState<number | null>(null);
  useEffect(() => {
    if (!pendingDailyId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await dailyApi.getDailyDetail(pendingDailyId);
        if (cancelled) return;
        const status = res.data?.analysisStatus;
        if (status === "DONE") {
          setPendingDailyId(null);
          setAnalysisReady(true);
        } else if (status === "FAILED") {
          setPendingDailyId(null);
          setAnalysisReady(false);
          pendingBirthReport.current = null;
        }
      } catch { /* retry next interval */ }
    };
    void poll();
    const id = window.setInterval(poll, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [pendingDailyId]);

  const openDailyReport = async (
    planet: DailyPlanet & { targetId?: number; aiSummary?: string },
    options?: { source?: "mypage" | "scene" },
  ) => {
    if (options?.source === "mypage") {
      const dailyIdNum = Number(planet.targetId ?? planet.id);
      const matchedStar = stars.find(s => s.kind === "DAILY" && s.targetId === dailyIdNum);
      setSelectedStarId(matchedStar?.id ?? planet.id);
      setTimelineFocusNonce();
    }
    setReportError(null);
    setSelectedDailyPlanet(planet);
    setSelectedDeepStar(null);
    setReportOrigin(options?.source ?? "scene");
    setIsSidePanelOpen(true);

    const dailyId = Number(planet.targetId ?? planet.id);
    if (Number.isNaN(dailyId) || dailyId <= 0) {
      setReportError("데일리 리포트 ID가 유효하지 않습니다.");
      return;
    }

    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const extractDailyAiSummary = (detail: any) => {
      const pickTextFromObject = (obj: any): string => {
        if (!obj || typeof obj !== "object") return "";
        const candidate = obj.analysis || obj.resultSummary || obj.result || obj.summary || obj.report || "";
        return typeof candidate === "string" ? candidate : "";
      };

      const normalizeCandidate = (value: any): string => {
        if (value && typeof value === "object") {
          const objectText = pickTextFromObject(value);
          return objectText ? objectText.trim() : "";
        }

        if (typeof value !== "string") return "";

        const trimmed = value
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        if (!trimmed) return "";

        const tryParse = (text: string): string => {
          try {
            const parsed = JSON.parse(text);
            const parsedText = pickTextFromObject(parsed);
            return parsedText ? parsedText.trim() : "";
          } catch {
            return "";
          }
        };

        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
          const fullParsed = tryParse(trimmed);
          if (fullParsed) return fullParsed;
        }

        const firstBrace = trimmed.indexOf("{");
        const lastBrace = trimmed.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          const embedded = trimmed.slice(firstBrace, lastBrace + 1);
          const embeddedParsed = tryParse(embedded);
          if (embeddedParsed) return embeddedParsed;
        }

        const analysisMatch = trimmed.match(/"analysis"\s*:\s*"([\s\S]*?)"/i);
        if (analysisMatch?.[1]) {
          try {
            return JSON.parse(`"${analysisMatch[1].replace(/"/g, '\\"')}"`).trim();
          } catch {
            return analysisMatch[1].trim();
          }
        }

        return trimmed;
      };

      const parseRaw = (raw: any) => {
        if (!raw) return null;
        if (typeof raw === "string") {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        }
        return raw;
      };

      const raw = parseRaw(detail?.analysisRaw ?? detail?.aiResult?.raw);

      return normalizeDeepReportText(
        normalizeCandidate(detail?.analysisResult)
        || normalizeCandidate(detail?.aiResult?.result)
        || normalizeCandidate(detail?.aiResult?.resultSummary)
        || normalizeCandidate(raw?.resultSummary)
        || normalizeCandidate(raw?.result)
        || normalizeCandidate(raw?.summary)
        || normalizeCandidate(raw?.analysis)
        || normalizeCandidate(raw?.report)
        || pickTextFromObject(raw)
        || "",
      );
    };

    setReportLoading(true);
    try {
      // AI 결과 저장 직후 열었을 때를 고려해 짧게 재시도하여 요약 연결률을 높인다.
      let detail: any = null;
      let aiSummary = "";
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const res = await dailyApi.getDailyDetail(dailyId);
        if (!res.success || !res.data) throw new Error("daily detail API returned success=false");

        detail = res.data;
        aiSummary = extractDailyAiSummary(detail);
        if (aiSummary) break;

        if (attempt < 3) {
          await sleep(1200);
        }
      }

      if (!detail) throw new Error("daily detail is empty");
      setSelectedDailyPlanet((prev: any) => ({
        ...prev,
        memo: detail.content || prev?.memo || "",
        shell: detail.emotionColor || prev?.shell,
        core: detail.emotionColor || prev?.core,
        analysisStatus: detail.analysisStatus || prev?.analysisStatus,
        drawingImageUrl: detail.drawingImageUrl || prev?.drawingImageUrl || "",
        aiSummary,
      }));
    } catch (e) {
      console.error("fetch daily detail fail:", e);
      setReportError(getApiErrorMessage(e, "데일리 리포트를 불러오지 못했습니다."));
    } finally {
      setReportLoading(false);
    }
  };

  openDailyReportRef.current = openDailyReport;

  const handleTimelineItemClick = async (item: any) => {
    setSelectedStarId(item.id);
    if (item.kind === "deep") {
      const deepStar = deepStars.find((s: any) => s.id === item.id);
      if (deepStar) await openDeepReport(deepStar as any);
      return;
    }
    const dailyPlanet = dailyPlanets.find((p: any) => p.id === item.id);
    if (dailyPlanet) await openDailyReport(dailyPlanet as any);
  };

  const handleDeleteDaily = async (dailyId: number) => {
    try {
      setReportError(null);
      setReportLoading(true);
      await dailyApi.deleteDaily(dailyId);
      removeStarsByTarget(dailyId, "DAILY");
      await fetchStarMap();
      setSelectedDailyPlanet(null);
      setSelectedDeepStar(null);
      setDeepPages([]);
      setIsSidePanelOpen(false);
    } catch (e) {
      setReportError(getApiErrorMessage(e, "데일리 리포트를 삭제하지 못했습니다."));
    } finally {
      setReportLoading(false);
    }
  };

  const handleDeleteDeepSession = async (sessionId: number) => {
    try {
      setReportError(null);
      setReportLoading(true);
      await deepApi.deleteSession(sessionId);

      const remainingPages = deepPages.filter((p: any) => Number(p.sessionId) !== sessionId);
      setDeepPages(remainingPages);

      if (remainingPages.length === 0) {
        // 마지막 검사 삭제 → 패널 닫기 + 별 새로고침
        setSelectedDeepStar(null);
        setSelectedDailyPlanet(null);
        setIsSidePanelOpen(false);
      }

      await fetchStarMap();
    } catch (e) {
      setReportError(getApiErrorMessage(e, "검사를 삭제하지 못했습니다."));
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedStarId && mypageStar) {
      setSelectedStarId(mypageStar.id);
    }
  }, [selectedStarId, mypageStar, setSelectedStarId]);

  // selectedStarId가 변경될 때 해당 아이템의 weekKey를 찾아 selectedWeekKey 업데이트
  useEffect(() => {
    if (!selectedStarId || selectedStarId === mypageStar.id) {
      setSelectedWeekKey(null);
      return;
    }
    const found = timelineItems.find((i) => i.id === selectedStarId);
    setSelectedWeekKey(found?.weekKey ?? null);
  }, [selectedStarId, timelineItems, mypageStar.id]);

  const hoveredPlanetMeta = useMemo(() => (hoveredPlanet ? timelineItems.find(i => i.id === hoveredPlanet.id) : null), [hoveredPlanet, timelineItems]);
  const hoveredPlanetDateLabel = useMemo(() => {
    if (!hoveredPlanetMeta?.createdAt) return "";
    const parsed = new Date(hoveredPlanetMeta.createdAt);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [hoveredPlanetMeta]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-slate-100 animate-[fadeIn_0.6s_ease-out]">
      <div className="absolute inset-0 z-0">
        {/* 🔮 브랜드 로고 (상단 좌측) */}
        {!isCinematicMode && (
          <div className="fixed top-8 left-8 z-[60] pointer-events-none select-none animate-[fadeIn_1s_ease-out]">
            <h1 className="logo-text text-2xl">WOULD YOU DRAW</h1>
          </div>
        )}

        {/* 코치마크 센터 앵커 */}
        <div id="center-star-anchor" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 pointer-events-none" />
        <StarScene
          onReady={() => setIsStarSceneReady(true)}
          dailyPlanets={dailyPlanets}
          deepStars={deepStars}
          mypageStar={mypageStar}
          onStarClick={() => { setIsMyUniverseOpen(true); setSelectedStarId(mypageStar.id); }}
          onDeepStarClick={(star) => void openDeepReport(star as any)}
          onPlanetClick={(p) => void openDailyReport(p as any)}
          onStarSelect={setSelectedStarId}
          selectedStarId={selectedStarId}
          hoveredStarId={hoveredPlanet?.id || null}
          selectedWeekKey={selectedWeekKey}
          onStarHover={(d) => {
            if (d.id) {
              if (hoverClearTimerRef.current) window.clearTimeout(hoverClearTimerRef.current);
              setHoveredPlanet({ id: d.id, x: d.x ?? 0, y: d.y ?? 0 });
            } else {
              hoverClearTimerRef.current = window.setTimeout(() => {
                if (!isTooltipHoverRef.current) setHoveredPlanet(null);
              }, 200);
            }
          }}
          onViewModeChange={setViewMode}
          isReportOpen={isSidePanelOpen}
          isMyUniverseOpen={isMyUniverseOpen}
          isDailyDetailOpen={isDailyDetailModalOpen || isDailyColoringModalOpen}
          isWeeklyOpen={isWeeklyContentModalOpen || isWeeklyHtpModalOpen || isWeeklyPirModalOpen || isWeeklySwModalOpen}
          newbornStarId={newbornStarId}
          externalFocusNonce={timelineFocusNonce}
          onBirthComplete={handleBirthComplete}
          isAnalysisComplete={analysisReady}
        />
      </div>

      {!isMacro && hoveredPlanetMeta && hoveredPlanet && (
        <div
          className="fixed z-40 w-44 rounded-xl border border-white/15 bg-slate-950/80 p-3 text-xs text-slate-200 backdrop-blur shadow-2xl pointer-events-auto"
          style={{ left: hoveredPlanet.x + 12, top: hoveredPlanet.y + 12 }}
          onMouseEnter={() => isTooltipHoverRef.current = true}
          onMouseLeave={() => { isTooltipHoverRef.current = false; setHoveredPlanet(null); }}
        >
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${hoveredPlanetMeta.original.isTemporary ? "animate-pulse" : ""}`} style={{ backgroundColor: hoveredPlanetMeta.color }} />
              {hoveredPlanetMeta.original.isTemporary ? "분석 중..." : hoveredPlanetMeta.label}
            </span>
          </div>
          {hoveredPlanetDateLabel && (
            <div className="mt-2 text-[11px] text-slate-400">
              {hoveredPlanetDateLabel}
            </div>
          )}
        </div>
      )}

      {!isCinematicMode && (
        <TimelineHUD
          isMacro={isMacro}
          isTimelineOpen={isTimelineOpen}
          setIsTimelineOpen={setIsTimelineOpen}
          timelineItems={timelineItems}
          dailyPlanets={dailyPlanets}
          selectedStarId={selectedStarId}
          selectedWeekKey={selectedWeekKey}
          onItemClick={(id) => {
            setTimelineFocusNonce();
            if (id === mypageStar.id) {
              setSelectedStarId(id);
              return;
            }
            // HUD 별 클릭 → 카메라 포커스 + 상세 리포트 사이드 패널 열기
            setSelectedStarId(id);
            const item = timelineItems.find((i) => i.id === id);
            if (item) void handleTimelineItemClick(item);
          }}
          onWeekRowClick={(id) => {
            // 주(행) 클릭은 리포트 오픈 없이 카메라/별자리 포커스만 이동
            setTimelineFocusNonce();
            setSelectedStarId(id);
          }}
        />
      )}

      {/* 데일리 자율 드로잉 모달 */}
      {isDailyFreeDrawModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950">
          <DailyFreeDrawView
            isModal
            onClose={() => setDailyFreeDrawModalOpen(false)}
            onBackToContent={() => {
              setDailyFreeDrawModalOpen(false);
              setDailyContentModalOpen(true);
            }}
            onComplete={() => {
              setDailyFreeDrawModalOpen(false);
              setDailyCompleteModalOpen(true);
            }}
          />
        </div>
      )}

      {/* 튜토리얼 다시보기 버튼 */}
      {!isCinematicMode && (
        <button
          id="re-tutorial-btn"
          onClick={handleStartTutorial}
          className="fixed bottom-4 left-4 z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/50 backdrop-blur-md transition-all hover:scale-110 hover:border-white/40 hover:bg-white/20 hover:text-white"
          title="튜토리얼 다시보기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      )}

      {/* 🎬 시네마틱 모드 종료 버튼 (모드 활성 시 상단 같은 위치에 아주 은은하게 표시) */}
      {isCinematicMode && (
        <button
          id="exit-cinematic-btn"
          onClick={() => setIsCinematicMode(false)}
          className="fixed top-6 right-6 z-[60] flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-white/10 backdrop-blur-[2px] transition-all hover:scale-110 hover:border-white/30 hover:bg-white/15 hover:text-white/60 group"
          title="UI 다시 보기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M21 21H3V3" />
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}

      {/* 👀 시네마틱 모드 진입 버튼 (화면 우상단) */}
      {!isCinematicMode && !isSidePanelOpen && (
        <button
          id="enter-cinematic-btn"
          onClick={() => setIsCinematicMode(true)}
          className="fixed top-6 right-6 z-[60] flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/50 backdrop-blur-md transition-all hover:scale-110 hover:border-white/40 hover:bg-white/20 hover:text-white group shadow-lg"
          title="UI 숨기기 (시네마틱 모드)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors group-hover:text-white">
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}

      {/* HUD 우측 사이드 패널 (상세 리포트) */}
      <StarSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => {
          setIsSidePanelOpen(false);
          setReportOrigin(null);
        }}
        onBack={reportOrigin === "mypage" && (selectedDeepStar || selectedDailyPlanet)
          ? () => {
            setIsSidePanelOpen(false);
            setSelectedDeepStar(null);
            setSelectedDailyPlanet(null);
            setIsMyUniverseOpen(true);
          }
          : undefined}
        reportLoading={reportLoading}
        reportError={reportError}
        selectedDeepStar={selectedDeepStar}
        selectedDailyPlanet={selectedDailyPlanet}
        deepPages={deepPages}
        onRefresh={selectedDeepStar ? () => void openDeepReport(selectedDeepStar as any, { silent: true }) : undefined}
        onDeleteDaily={handleDeleteDaily}
        onDeleteDeepSession={handleDeleteDeepSession}
      />

      <MyUniverseModal
        isOpen={isMyUniverseOpen}
        onClose={() => setIsMyUniverseOpen(false)}
        mypageStar={mypageStar}
        dailyPlanets={dailyPlanets}
        deepStars={deepStars}
        onDailyPlanetClick={(planet) => { setIsMyUniverseOpen(false); void openDailyReport(planet as any, { source: "mypage" }); }}
        onDeepStarClick={(star) => { setIsMyUniverseOpen(false); void openDeepReport(star as any, { source: "mypage" }); }}
      />

      <AnimatePresence>
        {isDailyContentModalOpen && (
          <DailyContentSelector
            key="daily-content-selector"
            isModal
            onClose={() => setDailyContentModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDailyDetailModalOpen && (
          <DailyDetailView
            key="daily-detail-view"
            isModal
            onClose={() => setDailyDetailModalOpen(false)}
            onBackToContent={() => {
              setDailyDetailModalOpen(false);
              setDailyContentModalOpen(true);
            }}
            onComplete={() => {
              setDailyDetailModalOpen(false);
              setDailyCompleteModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDailyCompleteModalOpen && (
          <DailyCompleteView
            key="daily-complete-view"
            isModal
            onClose={() => setDailyCompleteModalOpen(false)}
            onSaved={(dailyId) => {
              setDailyCompleteModalOpen(false);
              // 데일리도 위클리와 동일한 별 탄생 흐름: 별가루 → 분석 대기 → 모임 → 별 탄생 → 리포트
              const starColor = (() => {
                const stored = localStorage.getItem("dailyPlanetShellColor");
                return stored || "#facc15";
              })();
              const reportPayload = { id: String(dailyId), targetId: dailyId, shell: starColor, core: starColor, memo: "", createdAt: new Date().toISOString() } as any;
              pendingBirthReport.current = reportPayload;
              pendingBirthKind.current = "daily";
              setPendingDailyId(dailyId);
            }}
            onBackToDetail={() => {
              setDailyCompleteModalOpen(false);
              const pendingRaw = localStorage.getItem("pendingDailyRecord");
              if (pendingRaw) {
                try {
                  const pending = JSON.parse(pendingRaw);
                  if (pending.dailyType === "COLORING") {
                    useUiStore.getState().setDailyColoringReturning(true);
                    setDailyColoringModalOpen(true);
                    return;
                  }
                  if (pending.dailyType === "FREE_DRAW") {
                    useUiStore.getState().setDailyFreeDrawReturning(true);
                    setDailyFreeDrawModalOpen(true);
                    return;
                  }
                } catch (e) {
                  // ignore
                }
              }
              setDailyDetailModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDailyColoringModalOpen && (
          <DailyColoringView
            key="daily-coloring-view"
            isModal
            onClose={() => setDailyColoringModalOpen(false)}
            onBackToContent={() => {
              setDailyColoringModalOpen(false);
              setDailyContentModalOpen(true);
            }}
            onComplete={() => {
              setDailyColoringModalOpen(false);
              setDailyCompleteModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWeeklyContentModalOpen && (
          <WeeklyContentView
            key="weekly-content-view"
            isModal
            onClose={() => setWeeklyContentModalOpen(false)}
            onStartHtp={() => {
              setWeeklyContentModalOpen(false);
              setWeeklyHtpModalOpen(true);
            }}
            onStartPir={() => {
              setWeeklyContentModalOpen(false);
              setWeeklyPirModalOpen(true);
            }}
            onStartSw={() => {
              setWeeklyContentModalOpen(false);
              setWeeklySwModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWeeklyHtpModalOpen && (
          <WeeklyHtpView
            key="weekly-htp-view"
            isModal
            onClose={() => setWeeklyHtpModalOpen(false)}
            onSaved={async (sid) => {
              setWeeklyHtpModalOpen(false);
              const starColor = colorFromId(String(sid), "DEEP");
              const createdAt = new Date().toISOString();
                const deepWeekKey = getSundayWeekKey(new Date(createdAt));
                const existingDeepStar = useUiStore.getState().stars.find((s) => {
                  if (s.kind !== "DEEP" || s.isTemporary) return false;
                  return normalizeWeekKey(s.weekStartDate, s.createdAt) === deepWeekKey;
                });
              setSelectedWeekKey(deepWeekKey);
              const reportPayload = { id: String(sid), targetId: sid, toneColor: starColor, createdAt, weekKey: deepWeekKey, label: "HTP", deepType: "HTP" } as any;
              if (!existingDeepStar) {
                pendingBirthReport.current = reportPayload;
                pendingBirthKind.current = "deep";
                addTemporaryStar({ kind: "DEEP", createdAt, color: starColor, targetId: sid, weekStartDate: deepWeekKey });
                setPendingSessionId(sid);
              } else {
                setDeepPages([{
                  sessionId: sid,
                  deepType: "HTP",
                  aiSummary: "",
                  submissions: [],
                  psychAssessments: [],
                  status: "ANALYZING",
                  createdAt,
                }]);
                setSelectedDeepStar((prev: any) => ({
                  ...(prev ?? {}),
                  ...reportPayload,
                  status: "ANALYZING",
                  submissions: [],
                  psychAssessments: [],
                  aiSummary: "",
                }));
                setSelectedStarId(existingDeepStar.id);
                void openDeepReport(reportPayload);
              }
            }}
            onBackToWeeklyContent={() => {
              setWeeklyHtpModalOpen(false);
              setWeeklyContentModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWeeklyPirModalOpen && (
          <WeeklySingleDrawView
            key="weekly-pir-view"
            testType="PERSON_IN_RAIN"
            isModal
            onClose={() => setWeeklyPirModalOpen(false)}
            onSaved={async (sid) => {
              setWeeklyPirModalOpen(false);
              const starColor = colorFromId(String(sid), "DEEP");
              const createdAt = new Date().toISOString();
                const deepWeekKey = getSundayWeekKey(new Date(createdAt));
                const existingDeepStar = useUiStore.getState().stars.find((s) => {
                  if (s.kind !== "DEEP" || s.isTemporary) return false;
                  return normalizeWeekKey(s.weekStartDate, s.createdAt) === deepWeekKey;
                });
              setSelectedWeekKey(deepWeekKey);
              const reportPayload = { id: String(sid), targetId: sid, toneColor: starColor, createdAt, weekKey: deepWeekKey, label: "PIR", deepType: "PERSON_IN_RAIN" } as any;
              if (!existingDeepStar) {
                pendingBirthReport.current = reportPayload;
                pendingBirthKind.current = "deep";
                addTemporaryStar({ kind: "DEEP", createdAt, color: starColor, targetId: sid, weekStartDate: deepWeekKey });
                setPendingSessionId(sid);
              } else {
                setDeepPages([{
                  sessionId: sid,
                  deepType: "PERSON_IN_RAIN",
                  aiSummary: "",
                  submissions: [],
                  psychAssessments: [],
                  status: "ANALYZING",
                  createdAt,
                }]);
                setSelectedDeepStar((prev: any) => ({
                  ...(prev ?? {}),
                  ...reportPayload,
                  status: "ANALYZING",
                  submissions: [],
                  psychAssessments: [],
                  aiSummary: "",
                }));
                setSelectedStarId(existingDeepStar.id);
                void openDeepReport(reportPayload);
              }
            }}
            onBackToWeeklyContent={() => {
              setWeeklyPirModalOpen(false);
              setWeeklyContentModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWeeklySwModalOpen && (
          <WeeklySingleDrawView
            key="weekly-sw-view"
            testType="STAR_WAVE"
            isModal
            onClose={() => setWeeklySwModalOpen(false)}
            onSaved={async (sid) => {
              setWeeklySwModalOpen(false);
              const starColor = colorFromId(String(sid), "DEEP");
              const createdAt = new Date().toISOString();
                const deepWeekKey = getSundayWeekKey(new Date(createdAt));
                const existingDeepStar = useUiStore.getState().stars.find((s) => {
                  if (s.kind !== "DEEP" || s.isTemporary) return false;
                  return normalizeWeekKey(s.weekStartDate, s.createdAt) === deepWeekKey;
                });
              setSelectedWeekKey(deepWeekKey);
              const reportPayload = { id: String(sid), targetId: sid, toneColor: starColor, createdAt, weekKey: deepWeekKey, label: "SW", deepType: "STAR_WAVE" } as any;
              if (!existingDeepStar) {
                pendingBirthReport.current = reportPayload;
                pendingBirthKind.current = "deep";
                addTemporaryStar({ kind: "DEEP", createdAt, color: starColor, targetId: sid, weekStartDate: deepWeekKey });
                setPendingSessionId(sid);
              } else {
                setDeepPages([{
                  sessionId: sid,
                  deepType: "STAR_WAVE",
                  aiSummary: "",
                  submissions: [],
                  psychAssessments: [],
                  status: "ANALYZING",
                  createdAt,
                }]);
                setSelectedDeepStar((prev: any) => ({
                  ...(prev ?? {}),
                  ...reportPayload,
                  status: "ANALYZING",
                  submissions: [],
                  psychAssessments: [],
                  aiSummary: "",
                }));
                setSelectedStarId(existingDeepStar.id);
                void openDeepReport(reportPayload);
              }
            }}
            onBackToWeeklyContent={() => {
              setWeeklySwModalOpen(false);
              setWeeklyContentModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default HomePage;