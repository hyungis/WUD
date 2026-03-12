import { useEffect, useMemo, useRef, useState } from "react";
import { starApi } from "../../api/star";
import { dailyApi } from "../../api/daily";
import { deepApi } from "../../api/deep";

import type { DailyPlanet, DeepStar } from "./utils/homeHelpers";
import { getWeekKey, colorFromId, normalizeDeepReportText } from "./utils/homeHelpers";
import { StarScene } from "./components/scene/StarScene";
import { useUiStore } from "../../store/uiStore";

import { MyUniverseModal } from "./components/modals/MyUniverseModal";
import { TimelineHUD } from "./components/ui/TimelineHUD";
import { DeepReportModal } from "./components/modals/DeepReportModal";
import { DailyReportModal } from "./components/modals/DailyReportModal";

type HomeStar = {
  id: string;
  targetId?: number;
  constellationId?: number;
  kind: "DAILY" | "DEEP";
  createdAt: string;
  weekStartDate?: string;
  color: string;
};

// ==========================================
// 5. 메인 페이지 (UI)
// ==========================================

function HomePage() {
  const [isMyUniverseOpen, setIsMyUniverseOpen] = useState(false);
  const [selectedDeepStar, setSelectedDeepStar] = useState<any>(null);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [selectedDailyPlanet, setSelectedDailyPlanet] = useState<DailyPlanet | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<{ id: string; x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<"macro" | "micro">("micro");
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const setOverlayOpen = useUiStore((state) => state.setOverlayOpen);

  const isMacro = viewMode === "macro";
  const hoverClearTimerRef = useRef<number | null>(null);
  const isTooltipHoverRef = useRef(false);

  useEffect(() => {
    const overlayOpen = isMyUniverseOpen || !!selectedDeepStar || isDailyReportOpen;
    setOverlayOpen(overlayOpen);
    return () => setOverlayOpen(false);
  }, [isMyUniverseOpen, selectedDeepStar, isDailyReportOpen, setOverlayOpen]);

  const mypageStar = useMemo(() => ({
    id: "center-mypage-star",
    createdAt: new Date().toISOString(),
    toneColor: "#f8fafc",
    label: "나의 중심",
  }), []);

  const [stars, setStars] = useState<HomeStar[]>([]);
  const [timelineItems, setTimelineItems] = useState<any[]>([]);

  // 컴포넌트 로드 시 지도(별) 조회
  useEffect(() => {
    const fetchStars = async () => {
      try {
        const res = await starApi.getStarMap();
        if (!res.success) throw new Error("star map API returned success=false");

        const payload = res.data as any;
        const rawStars = Array.isArray(payload?.stars)
          ? payload.stars
          : Array.isArray(payload)
            ? payload
            : Array.isArray((payload as any)?.data?.stars)
              ? (payload as any).data.stars
              : [];

        const fetchedStars: HomeStar[] = rawStars.map((s: any) => {
          const id = String(s.starId ?? s.id ?? s.targetId ?? "");
          const kindRaw = String(s.kind ?? s.starKind ?? s.type ?? "DAILY").toUpperCase();
          const kind = (kindRaw === "DEEP" || kindRaw === "HTP" || kindRaw.includes("DEEP") ? "DEEP" : "DAILY") as "DAILY" | "DEEP";
          const createdAtRaw = s.createdAt ?? s.created_at ?? s.timestamp ?? s.weekStartDate;
          const createdAt = createdAtRaw ? String(createdAtRaw) : new Date().toISOString();
          const weekStartDate = s.weekStartDate ?? s.week_start_date;
          const targetId = typeof s.targetId === "number" ? s.targetId : Number(s.targetId);
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

        setStars(fetchedStars);

        const grouped = fetchedStars.map((s) => ({
          id: s.id,
          kind: (s.kind || "daily").toLowerCase(),
          color: s.color,
          label: s.kind === "DAILY" ? "데일리 행성" : "심층 별",
          weekKey: s.weekStartDate ? getWeekKey(new Date(s.weekStartDate)) : getWeekKey(new Date(s.createdAt)),
          createdAt: s.createdAt,
          original: s,
        }));
        setTimelineItems(grouped);
      } catch (e) {
        console.error("fetch star map fail:", e);
        setStars([]);
        setTimelineItems([]);
      }
    };
    fetchStars();
  }, []);

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
      })) as (DailyPlanet & { targetId?: number; aiSummary?: string })[],
    [stars],
  );

  const deepStars = useMemo(
    () => stars
      .filter(s => s.kind === "DEEP")
      .map((s) => ({
        id: s.id,
        targetId: s.targetId,
        toneColor: s.color,
        createdAt: s.createdAt,
        weekKey: s.weekStartDate ? getWeekKey(new Date(s.weekStartDate)) : getWeekKey(new Date(s.createdAt)),
        label: "심층 별",
      })) as (DeepStar & { targetId?: number; aiSummary?: string; questions?: string[] })[],
    [stars],
  );

  const openDeepReport = async (star: DeepStar & { targetId?: number; aiSummary?: string; questions?: string[] }) => {
    setReportError(null);
    setSelectedDeepStar(star);

    const sessionId = Number(star.targetId ?? star.id);
    if (Number.isNaN(sessionId) || sessionId <= 0) {
      setReportError("심층 리포트 ID가 유효하지 않습니다.");
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
      setReportError("심층 리포트를 불러오지 못했습니다.");
    } finally {
      setReportLoading(false);
    }
  };

  const openDailyReport = async (planet: DailyPlanet & { targetId?: number; aiSummary?: string }) => {
    setReportError(null);
    setSelectedDailyPlanet(planet);
    setIsDailyReportOpen(true);

    const dailyId = Number(planet.targetId ?? planet.id);
    if (Number.isNaN(dailyId) || dailyId <= 0) {
      setReportError("데일리 리포트 ID가 유효하지 않습니다.");
      return;
    }

    setReportLoading(true);
    try {
      const res = await dailyApi.getDailyDetail(dailyId);
      if (!res.success || !res.data) throw new Error("daily detail API returned success=false");

      const detail = res.data;
      setSelectedDailyPlanet((prev: any) => ({
        ...prev,
        memo: detail.content || prev?.memo || "",
        shell: detail.emotionColor || prev?.shell,
        core: detail.emotionColor || prev?.core,
        aiSummary: detail.aiResult?.result || "",
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
  }, [selectedStarId, mypageStar]);

  const hoveredPlanetMeta = useMemo(() => (hoveredPlanet ? timelineItems.find(i => i.id === hoveredPlanet.id) : null), [hoveredPlanet, timelineItems]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-slate-100 animate-[fadeIn_0.6s_ease-out]">
      <StarScene
        dailyPlanets={dailyPlanets} deepStars={deepStars} mypageStar={mypageStar}
        onViewModeChange={setViewMode} onStarSelect={setSelectedStarId}
        hoveredStarId={hoveredPlanet?.id || null}
        onStarClick={() => setIsMyUniverseOpen(true)}
        onDeepStarClick={(star) => void openDeepReport(star as any)}
        onPlanetClick={(p) => void openDailyReport(p as any)}
        onStarHover={(d) => {
          if (d.id) {
            if (hoverClearTimerRef.current) window.clearTimeout(hoverClearTimerRef.current);
            setHoveredPlanet({ id: d.id, x: d.x!, y: d.y! });
          } else {
            hoverClearTimerRef.current = window.setTimeout(() => { if (!isTooltipHoverRef.current) setHoveredPlanet(null); }, 200);
          }
        }}
        selectedStarId={selectedStarId}
      />

      {!isMacro && hoveredPlanetMeta && hoveredPlanet && (
        <div
          className="fixed z-40 w-44 rounded-xl border border-white/15 bg-slate-950/80 p-3 text-xs text-slate-200 backdrop-blur shadow-2xl pointer-events-auto"
          style={{ left: hoveredPlanet.x + 12, top: hoveredPlanet.y + 12 }}
          onMouseEnter={() => isTooltipHoverRef.current = true}
          onMouseLeave={() => { isTooltipHoverRef.current = false; setHoveredPlanet(null); }}
        >
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hoveredPlanetMeta.color }} />
              {hoveredPlanetMeta.label}
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
        onItemClick={(id) => {
          if (id === mypageStar.id) {
            setSelectedStarId(id);
            return;
          }
          const item = timelineItems.find((i) => i.id === id);
          if (item) void handleTimelineItemClick(item);
        }}
      />

      <MyUniverseModal
        isOpen={isMyUniverseOpen}
        onClose={() => setIsMyUniverseOpen(false)}
        mypageStar={mypageStar}
        dailyPlanets={dailyPlanets}
        deepStars={deepStars}
        onDeepStarClick={(star) => { setIsMyUniverseOpen(false); void openDeepReport(star as any); }}
      />

      <DeepReportModal
        selectedDeepStar={selectedDeepStar}
        setSelectedDeepStar={setSelectedDeepStar}
        reportLoading={reportLoading}
        reportError={reportError}
      />

      <DailyReportModal
        isOpen={isDailyReportOpen}
        onClose={() => { setIsDailyReportOpen(false); setSelectedDailyPlanet(null); }}
        planet={selectedDailyPlanet}
        reportLoading={reportLoading}
        reportError={reportError}
      />
    </div>
  );
}

export default HomePage;