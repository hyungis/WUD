import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { dailyApi } from "../../api/daily";
import { deepApi } from "../../api/deep";
import type { DailyPlanet, DeepStar } from "./utils/homeHelpers";
import { getWeekKey, normalizeDeepReportText, colorFromId } from "./utils/homeHelpers";
import { StarScene } from "./components/scene/StarScene";
import { useUiStore } from "../../store/uiStore";
import { getApiErrorMessage } from "../../utils/apiError";

import { MyUniverseModal } from "./components/modals/MyUniverseModal";
import { TimelineHUD } from "./components/ui/TimelineHUD";
import { StarSidePanel } from "./components/ui/StarSidePanel";
import DailyContentSelector from "../daily/components/DailyContentSelector";
import DailyDetailView from "../daily/DailyDetailView";
import DailyColoringView from "../daily/DailyColoringView";
import DailyCompleteView from "../daily/DailyCompleteView";
import WeeklyContentView from "../deep/WeeklyContentView";
import WeeklyHtpView from "../deep/WeeklyHtpView";
import WeeklySingleDrawView from "../deep/WeeklySingleDrawView";

// ==========================================
// 5. 메인 페이지 (UI)
// ==========================================

function HomePage() {
  const isMyUniverseOpen = useUiStore((state) => state.isMyUniverseOpen);
  const setIsMyUniverseOpen = useUiStore((state) => state.setIsMyUniverseOpen);
  const [selectedDeepStar, setSelectedDeepStar] = useState<any>(null);
  const [deepPages, setDeepPages] = useState<any[]>([]);
  const [selectedDailyPlanet, setSelectedDailyPlanet] = useState<DailyPlanet | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null);
  const [analysisReady, setAnalysisReady] = useState(false);
  const stars = useUiStore((state) => state.stars);
  const fetchStarMap = useUiStore((state) => state.fetchStarMap);
  const addTemporaryStar = useUiStore((state) => state.addTemporaryStar);
  const selectedStarId = useUiStore((state) => state.selectedStarId);
  const setSelectedStarId = useUiStore((state) => state.setSelectedStarId);
  const newbornStarId = useUiStore((state) => state.newbornStarId);
  const setNewbornStarId = useUiStore((state) => state.setNewbornStarId);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<{ id: string; x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<"macro" | "micro">("micro");
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [timelineFocusNonce, setTimelineFocusNonce] = useState(0);
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
  const isWeeklyContentModalOpen = useUiStore((state) => state.isWeeklyContentModalOpen);
  const setWeeklyContentModalOpen = useUiStore((state) => state.setWeeklyContentModalOpen);
  const isWeeklyHtpModalOpen = useUiStore((state) => state.isWeeklyHtpModalOpen);
  const setWeeklyHtpModalOpen = useUiStore((state) => state.setWeeklyHtpModalOpen);
  const isWeeklyPirModalOpen = useUiStore((state) => state.isWeeklyPirModalOpen);
  const setWeeklyPirModalOpen = useUiStore((state) => state.setWeeklyPirModalOpen);
  const isWeeklySwModalOpen = useUiStore((state) => state.isWeeklySwModalOpen);
  const setWeeklySwModalOpen = useUiStore((state) => state.setWeeklySwModalOpen);

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
    isWeeklyContentModalOpen,
    isWeeklyHtpModalOpen,
    isWeeklyPirModalOpen,
    isWeeklySwModalOpen,
    isSidePanelOpen,
    setOverlayOpen,
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

  const timelineItems = useMemo(() => {
    return stars.map((s) => ({
      id: s.id,
      kind: (s.kind || "daily").toLowerCase(),
      color: s.color,
      label: s.kind === "DAILY" ? "DAILY PLANET" : "WEEKLY PLANET",
      weekKey: s.weekStartDate ? getWeekKey(new Date(s.weekStartDate)) : getWeekKey(new Date(s.createdAt)),
      createdAt: s.createdAt,
      original: s,
    }));
  }, [stars]);

  // 컴포넌트 로드 시 지도(별) 조회
  useEffect(() => {
    void fetchStarMap().catch((e) => {
      console.error("fetch star map fail:", e);
    });
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
      setTimelineFocusNonce(n => n + 1);
    }
  }, [newbornStarId, setSelectedStarId]);

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
        weekKey: s.weekStartDate ? getWeekKey(new Date(s.weekStartDate)) : getWeekKey(new Date(s.createdAt)),
        label: s.isTemporary ? "분석 중..." : "위클리 별",
        isTemporary: s.isTemporary,
      })),
    [stars],
  );

  const openDeepReport = async (
    star: DeepStar & { targetId?: number; aiSummary?: string; questions?: string[]; deepType?: string },
    options?: { silent?: boolean },
  ) => {
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
      setReportLoading(true);
    }
    try {
      // 모든 완료/분석중 세션을 가져와 검사별 탭으로 구성
      const sessionsRes = await deepApi.getPastSessions();
      const allSessions = sessionsRes.success && Array.isArray(sessionsRes.data) ? sessionsRes.data : [];

      // deepType별로 최신 세션만 1개씩 보여줌 (DRAFT/FAILED 제외)
      const byType = new Map<string, any>();
      for (const s of allSessions) {
        if (s.status === "DRAFT" || s.status === "FAILED") continue;
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

      // 방금 요청한 세션을 맨 앞으로 올려 즉시 해당 리포트가 보이도록 한다.
      const targetIdx = pages.findIndex((p) => Number(p.sessionId) === sessionId);
      if (targetIdx > 0) {
        const [targetPage] = pages.splice(targetIdx, 1);
        pages.unshift(targetPage);
      }
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

  const openDailyReport = async (planet: DailyPlanet & { targetId?: number; aiSummary?: string }) => {
    setReportError(null);
    setSelectedDailyPlanet(planet);
    setSelectedDeepStar(null);
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-slate-100 animate-[fadeIn_0.6s_ease-out]">
      <div className="absolute inset-0 z-0">
        <StarScene
          dailyPlanets={dailyPlanets}
          deepStars={deepStars}
          mypageStar={mypageStar}
          onStarClick={() => setIsMyUniverseOpen(true)}
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
        </div>
      )}

      <TimelineHUD
        isMacro={isMacro}
        isTimelineOpen={isTimelineOpen}
        setIsTimelineOpen={setIsTimelineOpen}
        timelineItems={timelineItems}
        dailyPlanets={dailyPlanets}
        mypageStar={mypageStar}
        selectedStarId={selectedStarId}
        selectedWeekKey={selectedWeekKey}
        onItemClick={(id) => {
          setTimelineFocusNonce((prev) => prev + 1);
          if (id === mypageStar.id) {
            setSelectedStarId(id);
            return;
          }
          // HUD 별 클릭 → 카메라 포커스 + 상세 리포트 사이드 패널 열기
          setSelectedStarId(id);
          const item = timelineItems.find((i) => i.id === id);
          if (item) void handleTimelineItemClick(item);
        }}
      />

      {/* HUD 우측 사이드 패널 (상세 리포트) */}
      <StarSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        reportLoading={reportLoading}
        reportError={reportError}
        selectedDeepStar={selectedDeepStar}
        selectedDailyPlanet={selectedDailyPlanet}
        deepPages={deepPages}
        onRefresh={selectedDeepStar ? () => void openDeepReport(selectedDeepStar as any, { silent: true }) : undefined}
      />

      <MyUniverseModal
        isOpen={isMyUniverseOpen}
        onClose={() => setIsMyUniverseOpen(false)}
        mypageStar={mypageStar}
        dailyPlanets={dailyPlanets}
        deepStars={deepStars}
        onDeepStarClick={(star) => { setIsMyUniverseOpen(false); void openDeepReport(star as any); }}
      />

      {isDailyContentModalOpen && (
        <DailyContentSelector
          isModal
          onClose={() => setDailyContentModalOpen(false)}
        />
      )}

      {isDailyDetailModalOpen && (
        <DailyDetailView
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

      {isDailyCompleteModalOpen && (
        <DailyCompleteView
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
            setDailyDetailModalOpen(true);
          }}
        />
      )}

      {isDailyColoringModalOpen && (
        <DailyColoringView
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

      {isWeeklyContentModalOpen && (
        <WeeklyContentView
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

      {isWeeklyHtpModalOpen && (
        <WeeklyHtpView
          isModal
          onClose={() => setWeeklyHtpModalOpen(false)}
          onSaved={async (sid) => {
            const existingDeepStar = useUiStore.getState().stars.find(s => s.kind === "DEEP" && !s.isTemporary);
            setWeeklyHtpModalOpen(false);
            const starColor = colorFromId(String(sid), "DEEP");
            const reportPayload = { id: String(sid), targetId: sid, toneColor: starColor, createdAt: new Date().toISOString(), weekKey: "", label: "HTP", deepType: "HTP" } as any;
            if (!existingDeepStar) {
              pendingBirthReport.current = reportPayload;
              pendingBirthKind.current = "deep";
              addTemporaryStar({ kind: "DEEP", createdAt: new Date().toISOString(), color: starColor, targetId: sid });
              setPendingSessionId(sid);
            } else {
              setDeepPages([{
                sessionId: sid,
                deepType: "HTP",
                aiSummary: "",
                submissions: [],
                psychAssessments: [],
                status: "ANALYZING",
                createdAt: new Date().toISOString(),
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

      {isWeeklyPirModalOpen && (
        <WeeklySingleDrawView
          testType="PERSON_IN_RAIN"
          isModal
          onClose={() => setWeeklyPirModalOpen(false)}
          onSaved={async (sid) => {
            const existingDeepStar = useUiStore.getState().stars.find(s => s.kind === "DEEP" && !s.isTemporary);
            setWeeklyPirModalOpen(false);
            const starColor = colorFromId(String(sid), "DEEP");
            const reportPayload = { id: String(sid), targetId: sid, toneColor: starColor, createdAt: new Date().toISOString(), weekKey: "", label: "PIR", deepType: "PERSON_IN_RAIN" } as any;
            if (!existingDeepStar) {
              pendingBirthReport.current = reportPayload;
              pendingBirthKind.current = "deep";
              addTemporaryStar({ kind: "DEEP", createdAt: new Date().toISOString(), color: starColor, targetId: sid });
              setPendingSessionId(sid);
            } else {
              setDeepPages([{
                sessionId: sid,
                deepType: "PERSON_IN_RAIN",
                aiSummary: "",
                submissions: [],
                psychAssessments: [],
                status: "ANALYZING",
                createdAt: new Date().toISOString(),
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

      {isWeeklySwModalOpen && (
        <WeeklySingleDrawView
          testType="STAR_WAVE"
          isModal
          onClose={() => setWeeklySwModalOpen(false)}
          onSaved={async (sid) => {
            const existingDeepStar = useUiStore.getState().stars.find(s => s.kind === "DEEP" && !s.isTemporary);
            setWeeklySwModalOpen(false);
            const starColor = colorFromId(String(sid), "DEEP");
            const reportPayload = { id: String(sid), targetId: sid, toneColor: starColor, createdAt: new Date().toISOString(), weekKey: "", label: "SW", deepType: "STAR_WAVE" } as any;
            if (!existingDeepStar) {
              pendingBirthReport.current = reportPayload;
              pendingBirthKind.current = "deep";
              addTemporaryStar({ kind: "DEEP", createdAt: new Date().toISOString(), color: starColor, targetId: sid });
              setPendingSessionId(sid);
            } else {
              setDeepPages([{
                sessionId: sid,
                deepType: "STAR_WAVE",
                aiSummary: "",
                submissions: [],
                psychAssessments: [],
                status: "ANALYZING",
                createdAt: new Date().toISOString(),
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
    </div>
  );
}

export default HomePage;