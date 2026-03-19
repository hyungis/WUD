import { useEffect, useMemo, useRef, useState } from "react";
import { dailyApi } from "../../api/daily";
import { deepApi } from "../../api/deep";
import type { DailyPlanet, DeepStar } from "./utils/homeHelpers";
import { getWeekKey, normalizeDeepReportText } from "./utils/homeHelpers";
import { StarScene } from "./components/scene/StarScene";
import { useUiStore } from "../../store/uiStore";

import { MyUniverseModal } from "./components/modals/MyUniverseModal";
import { TimelineHUD } from "./components/ui/TimelineHUD";
import { StarSidePanel } from "./components/ui/StarSidePanel";
import DailyContentSelector from "../daily/components/DailyContentSelector";
import DailyDetailView from "../daily/DailyDetailView";
import DailyCompleteView from "../daily/DailyCompleteView";
import WeeklyContentView from "../deep/WeeklyContentView";
import WeeklyHtpView from "../deep/WeeklyHtpView";

// ==========================================
// 5. 메인 페이지 (UI)
// ==========================================

function HomePage() {
  const isMyUniverseOpen = useUiStore((state) => state.isMyUniverseOpen);
  const setIsMyUniverseOpen = useUiStore((state) => state.setIsMyUniverseOpen);
  const [selectedDeepStar, setSelectedDeepStar] = useState<any>(null);
  const [selectedDailyPlanet, setSelectedDailyPlanet] = useState<DailyPlanet | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const stars = useUiStore((state) => state.stars);
  const fetchStarMap = useUiStore((state) => state.fetchStarMap);
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
  const isWeeklyContentModalOpen = useUiStore((state) => state.isWeeklyContentModalOpen);
  const setWeeklyContentModalOpen = useUiStore((state) => state.setWeeklyContentModalOpen);
  const isWeeklyHtpModalOpen = useUiStore((state) => state.isWeeklyHtpModalOpen);
  const setWeeklyHtpModalOpen = useUiStore((state) => state.setWeeklyHtpModalOpen);

  const isMacro = viewMode === "macro";
  const hoverClearTimerRef = useRef<number | null>(null);
  const isTooltipHoverRef = useRef(false);

  useEffect(() => {
    const overlayOpen = isMyUniverseOpen
      || isDailyContentModalOpen
      || isDailyDetailModalOpen
      || isDailyCompleteModalOpen
      || isWeeklyContentModalOpen
      || isWeeklyHtpModalOpen
      || isSidePanelOpen;
    setOverlayOpen(overlayOpen);
    return () => setOverlayOpen(false);
  }, [
    isMyUniverseOpen,
    isDailyContentModalOpen,
    isDailyDetailModalOpen,
    isDailyCompleteModalOpen,
    isWeeklyContentModalOpen,
    isWeeklyHtpModalOpen,
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

  // 새로운 별이 생성되었을 때 자동 선택 및 애니메이션 처리
  useEffect(() => {
    if (newbornStarId) {
      setSelectedStarId(newbornStarId);
      
      // 애니메이션이 어느 정도 진행된 후(예: 4초) newborn 상태 해제
      const timer = setTimeout(() => {
        setNewbornStarId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [newbornStarId, setSelectedStarId, setNewbornStarId]);

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

  const openDeepReport = async (star: DeepStar & { targetId?: number; aiSummary?: string; questions?: string[] }) => {
    setReportError(null);
    setSelectedDeepStar(star);
    setSelectedDailyPlanet(null);
    setIsSidePanelOpen(true);

    const sessionId = Number(star.targetId ?? star.id);
    if (Number.isNaN(sessionId) || sessionId <= 0) {
      setReportError("위클리 리포트 ID가 유효하지 않습니다.");
      return;
    }

    setReportLoading(true);
    try {
      const res = await deepApi.getDeepResult(sessionId);
      if (!res.success || !res.data) throw new Error("deep result API returned success=false");

      const data = res.data;
      const aiSummary = normalizeDeepReportText(data.aiResult?.result || data.aiResult?.resultSummary || "");
      const submissions = Array.isArray(data.submissions) ? data.submissions : [];
      const psychAssessments = Array.isArray(data.psychAssessments) ? data.psychAssessments : [];
      const deepType = data.deepType || "HTP";
      const status = data.status || "DONE";
      const createdAt = star.createdAt;
      setSelectedDeepStar((prev: any) => ({ ...prev, aiSummary, submissions, psychAssessments, deepType, status, createdAt }));
    } catch (e) {
      console.error("fetch deep result fail:", e);
      setReportError("위클리 리포트를 불러오지 못했습니다.");
    } finally {
      setReportLoading(false);
    }
  };

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
        aiSummary,
      }));
    } catch (e) {
      console.error("fetch daily detail fail:", e);
      setReportError("데일리 리포트를 불러오지 못했습니다.");
    } finally {
      setReportLoading(false);
    }
  };

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
          onSaved={() => {}} // Store에서 직접 처리하므로 비워둠 (혹은 refreshStarsAfterSave는 호출부에서 함)
          onBackToDetail={() => {
            setDailyCompleteModalOpen(false);
            setDailyDetailModalOpen(true);
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
        />
      )}

      {isWeeklyHtpModalOpen && (
        <WeeklyHtpView
          isModal
          onClose={() => setWeeklyHtpModalOpen(false)}
          onSaved={() => {}}
          onBackToWeeklyContent={() => {
            setWeeklyHtpModalOpen(false);
            setWeeklyContentModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

export default HomePage;