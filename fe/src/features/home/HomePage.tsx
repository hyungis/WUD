import { useEffect, useMemo, useRef, useState } from "react";
import { starApi } from "../../api/star";
import { dailyApi } from "../../api/daily";
import { deepApi } from "../../api/deep";

import type { DailyPlanet, DeepStar } from "./utils/homeHelpers";
import { getWeekKey, formatDate, formatDateTimeKST } from "./utils/homeHelpers";
import { StarScene } from "./components/scene/StarScene";
import { useUiStore } from "../../store/uiStore";

type HomeStar = {
  id: string;
  targetId?: number;
  constellationId?: number;
  kind: "DAILY" | "DEEP";
  createdAt: string;
  weekStartDate?: string;
  color: string;
};

const DAILY_COLORS = ["#7dd3fc", "#38bdf8", "#22d3ee", "#60a5fa", "#93c5fd"];
const DEEP_COLORS = ["#fcd34d", "#f59e0b", "#fb923c", "#fbbf24", "#fde68a"];

const colorFromId = (id: string, kind: "DAILY" | "DEEP") => {
  const n = Number(id);
  const index = Number.isNaN(n) ? 0 : Math.abs(n) % 5;
  return kind === "DEEP" ? DEEP_COLORS[index] : DAILY_COLORS[index];
};

const S3_BASE_URL = (import.meta.env.VITE_S3_BASE_URL as string | undefined) ?? "https://wud-s3.s3.ap-northeast-2.amazonaws.com";

const buildPublicImageUrl = (imageKey?: string) => {
  if (!imageKey) return "";
  const normalized = imageKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${S3_BASE_URL}/${normalized}`;
};

const normalizeDeepReportText = (text?: string) => {
  if (!text) return "";
  return text
    .replace(/\r/g, "")
    .replace(/\n\s*\d+\s*\n\s*(\d+\.)/g, "\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
// ==========================================
// 4. My Universe 모달
// ==========================================

function MyUniverseModal({ isOpen, onClose, mypageStar, dailyPlanets, deepStars, onDeepStarClick }: {
  isOpen: boolean;
  onClose: () => void;
  mypageStar: { id: string; toneColor: string; label: string; createdAt: string };
  dailyPlanets: DailyPlanet[];
  deepStars: DeepStar[];
  onDeepStarClick: (star: DeepStar) => void;
}) {
  const [tab, setTab] = useState<"overview" | "daily" | "deep">("overview");
  const [selectedItem, setSelectedItem] = useState<
    | { type: "daily"; data: DailyPlanet }
    | null
  >(null);

  useEffect(() => {
    if (isOpen) { setTab("overview"); setSelectedItem(null); }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedItem) setSelectedItem(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, selectedItem]);

  if (!isOpen) return null;

  const totalRecords = dailyPlanets.length + deepStars.length;
  const uniqueWeeks = new Set([
    ...dailyPlanets.map(p => getWeekKey(new Date(p.createdAt))),
    ...deepStars.map(s => s.weekKey || getWeekKey(new Date(s.createdAt))),
  ]).size;

  const TABS = [
    { key: "overview" as const, label: "개요" },
    { key: "daily" as const, label: `데일리 (${dailyPlanets.length})` },
    { key: "deep" as const, label: `심층 (${deepStars.length})` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl">
        {/* 상단 헤더 */}
        <div className="relative px-7 pt-7 pb-5 flex-shrink-0">
          {/* 배경 글로우 */}
          <div
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full blur-3xl opacity-30"
            style={{ backgroundColor: mypageStar.toneColor }}
          />
          <div className="flex items-center gap-4 relative z-10">
            {/* 중심별 아이콘 */}
            <div
              className="flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: mypageStar.toneColor + "33", border: `1px solid ${mypageStar.toneColor}55` }}
            >
              <div className="h-6 w-6 rotate-45 rounded-sm" style={{ backgroundColor: mypageStar.toneColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-1">My Universe</p>
              <h2 className="text-xl font-bold text-slate-100 truncate">{mypageStar.label}</h2>
              <p className="text-xs text-slate-400 mt-0.5">총 {totalRecords}개 기록 · {uniqueWeeks}주</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 mt-5 rounded-xl bg-white/5 p-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelectedItem(null); }}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all duration-200 ${tab === t.key
                  ? "bg-white/15 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 custom-scrollbar">

          {/* ── 개요 탭 ── */}
          {tab === "overview" && (
            <div className="space-y-4">
              {/* 통계 카드 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "전체 기록", value: totalRecords, unit: "개" },
                  { label: "데일리", value: dailyPlanets.length, unit: "개" },
                  { label: "심층 (HTP)", value: deepStars.length, unit: "개" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/5 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-100">{stat.value}<span className="text-sm font-normal text-slate-400 ml-0.5">{stat.unit}</span></p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* 나의 톤 */}
              <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-3">나의 감정 톤</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex-shrink-0" style={{ backgroundColor: mypageStar.toneColor, boxShadow: `0 0 20px ${mypageStar.toneColor}66` }} />
                  <div>
                    <p className="text-base font-semibold text-slate-100">{mypageStar.toneColor}</p>
                    <p className="text-xs text-slate-400 mt-0.5">중심별 색상</p>
                  </div>
                </div>
              </div>

              {/* 최근 활동 */}
              {totalRecords > 0 && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-3">최근 활동</p>
                  <div className="space-y-2">
                    {[
                      ...dailyPlanets.map(p => ({ type: "daily" as const, id: p.id, color: p.shell, label: p.memo || "데일리 기록", date: p.createdAt, raw: p })),
                      ...deepStars.map(s => ({ type: "deep" as const, id: s.id, color: s.toneColor, label: s.label || "심층 기록", date: s.createdAt, raw: s })),
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((item, i) => (
                        <button
                          key={i}
                          onClick={() => item.type === "daily"
                            ? setSelectedItem({ type: "daily", data: item.raw as DailyPlanet })
                            : onDeepStarClick(item.raw as any)
                          }
                          className="w-full flex items-center gap-3 rounded-xl hover:bg-white/5 px-2 py-1.5 transition-colors text-left"
                        >
                          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="flex-1 text-xs text-slate-300 truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">{formatDate(item.date)}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${item.type === "deep" ? "bg-violet-500/20 text-violet-300" : "bg-sky-500/20 text-sky-300"}`}>
                            {item.type === "deep" ? "심층" : "데일리"}
                          </span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-slate-600 flex-shrink-0"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}

              {totalRecords === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <p className="text-slate-400 text-sm">아직 기록이 없어요</p>
                  <p className="text-slate-500 text-xs mt-1">데일리 또는 HTP 기록을 시작해보세요</p>
                </div>
              )}
            </div>
          )}

          {/* ── 데일리 탭 ── */}
          {tab === "daily" && (
            <div className="space-y-3">
              {dailyPlanets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <p className="text-slate-400 text-sm">데일리 기록이 없어요</p>
                </div>
              ) : (
                [...dailyPlanets]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((planet, i) => (
                    <button
                      key={planet.id || i}
                      onClick={() => setSelectedItem({ type: "daily", data: planet })}
                      className="w-full rounded-2xl border border-white/8 bg-white/5 hover:bg-white/10 p-4 flex items-start gap-4 transition-colors text-left"
                    >
                      {/* 행성 아이콘: 정팔면체 투영(회전 다이아몬드) */}
                      <div className="flex-shrink-0 mt-0.5 h-9 w-9 flex items-center justify-center">
                        <div
                          className="h-7 w-7 rotate-45 rounded-sm"
                          style={{
                            background: `linear-gradient(135deg, ${planet.shell}ee, ${planet.core || planet.shell}88)`,
                            boxShadow: `0 0 10px ${planet.shell}66`,
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-200 truncate">
                            {planet.memo ? planet.memo.slice(0, 30) + (planet.memo.length > 30 ? "…" : "") : "데일리 행성"}
                          </span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">{formatDate(planet.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">데일리</span>
                          {planet.objectType && <span className="text-[10px] text-slate-500">{planet.objectType}</span>}
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-600 flex-shrink-0 mt-2"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  ))
              )}
            </div>
          )}

          {/* ── 심층 탭 ── */}
          {tab === "deep" && (
            <div className="space-y-3">
              {deepStars.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <p className="text-slate-400 text-sm">심층 기록이 없어요</p>
                  <p className="text-slate-500 text-xs mt-1">HTP 검사를 통해 심층 별을 만들어보세요</p>
                </div>
              ) : (
                [...deepStars]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((star, i) => (
                    <button
                      key={star.id || i}
                      onClick={() => onDeepStarClick(star as any)}
                      className="w-full rounded-2xl border border-white/8 bg-white/5 hover:bg-white/10 p-4 flex items-start gap-4 transition-colors text-left"
                    >
                      {/* 별 아이콘 */}
                      <div
                        className="flex-shrink-0 mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: star.toneColor + "22", border: `1px solid ${star.toneColor}44` }}
                      >
                        <div className="h-4 w-4 rotate-45 rounded-sm" style={{ backgroundColor: star.toneColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-200">{star.label || "심층 별"}</span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">{formatDate(star.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300">HTP</span>
                          {star.weekKey && <span className="text-[10px] text-slate-500">{star.weekKey}</span>}
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-600 flex-shrink-0 mt-2"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 상세 리포트 패널 ── */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedItem(null); }}
        >
          <div className="relative mx-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            {/* 리포트 헤더 */}
            <div className="relative px-8 pt-7 pb-5 flex-shrink-0">
              <div
                className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-3xl opacity-40"
                style={{ backgroundColor: selectedItem.type === "daily" ? selectedItem.data.shell : (selectedItem.data as any).toneColor }}
              />
              <div className="flex items-center gap-3 relative z-10">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  aria-label="뒤로"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                    {selectedItem.type === "daily" ? "Daily Report" : "Deep Star Report"}
                  </p>
                  <h3 className="text-base font-bold text-slate-100 truncate mt-0.5">
                    {selectedItem.type === "daily"
                      ? (selectedItem.data.memo?.slice(0, 24) || "데일리 행성")
                      : ((selectedItem.data as any).label || "심층 별")}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 flex-shrink-0">
                  {formatDate(selectedItem.data.createdAt)}
                </span>
              </div>
            </div>

            {/* 리포트 본문 */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-5">

              {/* ── 데일리 리포트 ── */}
              {selectedItem.type === "daily" && (() => {
                const p = selectedItem.data;
                return (
                  <>
                    {/* 행성 시각화: 정팔면체(octahedron) 투영 */}
                    <div className="flex justify-center py-6">
                      <div className="relative flex items-center justify-center">
                        <div
                          className="h-24 w-24 rotate-45 rounded-lg shadow-2xl"
                          style={{
                            background: `linear-gradient(135deg, ${p.shell}ff, ${p.core || p.shell}99, ${p.shell}cc)`,
                            boxShadow: `0 0 40px ${p.shell}88, 0 0 80px ${p.shell}44`,
                          }}
                        />
                        {/* 내부 하이라이트 */}
                        <div
                          className="absolute h-6 w-6 rotate-45 rounded-sm opacity-60"
                          style={{ backgroundColor: '#ffffff', top: '22%', left: '26%' }}
                        />
                      </div>
                    </div>

                    {/* 색상 정보 */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Shell 색상</p>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: p.shell }} />
                          <span className="text-xs text-slate-200 font-mono">{p.shell}</span>
                        </div>
                      </div>
                      {p.core && (
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Core 색상</p>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: p.core }} />
                            <span className="text-xs text-slate-200 font-mono">{p.core}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 메모 */}
                    {p.memo && (
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오늘의 한 줄</p>
                        <p className="text-sm text-slate-200 leading-relaxed">"{p.memo}"</p>
                      </div>
                    )}

                    {/* 오브젝트 타입 */}
                    {p.objectType && (
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오브젝트 타입</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">{p.objectType}</span>
                          {p.objectColor && <div className="h-5 w-5 rounded-full" style={{ backgroundColor: p.objectColor }} />}
                        </div>
                      </div>
                    )}

                    {/* 날짜 */}
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">기록 일시</p>
                      <p className="text-sm text-slate-200">{formatDateTimeKST(p.createdAt)}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
        if (!res.success) {
          throw new Error("star map API returned success=false");
        }

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
      console.log("[DeepReport] API response:", JSON.stringify(res, null, 2));
      if (!res.success || !res.data) throw new Error("deep result API returned success=false");

      const data = res.data;
      const aiSummary = normalizeDeepReportText(data.aiResult?.result || data.aiResult?.resultSummary || "");
      const questions = Array.isArray(data.questions) && data.questions.length > 0
        ? data.questions
        : Array.isArray(data.aiResult?.questions)
          ? data.aiResult.questions
          : [];
      const submissions = Array.isArray(data.submissions) ? data.submissions : [];
      const psychAssessments = Array.isArray(data.psychAssessments) ? data.psychAssessments : [];
      const deepType = data.deepType || "HTP";
      const status = data.status || "DONE";
      const createdAt = data.sessionId ? star.createdAt : star.createdAt;
      console.log("[DeepReport] parsed:", { aiSummary: aiSummary.slice(0, 50), questions, submissions, psychAssessments, deepType, status });
      setSelectedDeepStar((prev: any) => ({ ...prev, aiSummary, questions, submissions, psychAssessments, deepType, status, createdAt }));
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
    <div className="relative min-h-screen overflow-hidden bg-black text-slate-100 animate-[fadeIn_0.6s_ease-out]"
      style={{ animation: "fadeIn 0.6s ease-out" }}
    >

      <div id="cinematic-iris" className="hidden" />
      <div id="cinematic-lid-top" className="hidden" />
      <div id="cinematic-lid-bottom" className="hidden" />



      <div className="pointer-events-none fixed right-6 top-1/2 z-40 h-48 w-1.5 -translate-y-1/2 rounded-full bg-slate-800/40 shadow-inner backdrop-blur-md">
        <div
          id="zoom-indicator"
          className="absolute bottom-0 w-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-75"
          style={{ height: "0%" }}
        />
      </div>

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
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: hoveredPlanetMeta.color }} />{hoveredPlanetMeta.label}</span>
          </div>
        </div>
      )}

      {/* Timeline HUD Panel */}
      <div
        className={`fixed left-6 top-24 z-30 flex flex-col rounded-2xl border border-white/10 bg-slate-950/50 shadow-2xl backdrop-blur-md transition-all duration-700 overflow-hidden w-72 translate-x-0 opacity-100 pointer-events-auto ${isTimelineOpen ? "max-h-[calc(100vh-14rem)]" : "max-h-[64px]"}`}
      >
        <div
          className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setIsTimelineOpen(!isTimelineOpen)}
        >
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Timeline</p>
          <button
            className="text-slate-400 hover:text-white transition group p-1"
            aria-label={isTimelineOpen ? "최소화" : "펼치기"}
          >
            {isTimelineOpen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            )}
          </button>
        </div>

        <div className={`flex flex-col flex-1 overflow-hidden px-5 transition-opacity duration-300 ${isTimelineOpen ? "opacity-100 pb-5" : "opacity-0 pb-0"}`}>
          <div className="flex justify-between rounded-xl bg-white/5 p-3 text-xs font-bold text-slate-100">
            <div>전체 {timelineItems.length}</div>
            <div>데일리 {dailyPlanets.length}</div>
          </div>
          <div className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            <button onClick={() => setSelectedStarId(mypageStar.id)} className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10 ${selectedStarId === mypageStar.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: mypageStar.toneColor }} />{mypageStar.label} (중심)</span>
            </button>
            {timelineItems.map((item) => (
              <button key={item.id} onClick={() => void handleTimelineItemClick(item)} className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10 ${selectedStarId === item.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}>
                <span className="flex items-center gap-2"><span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDate(item.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>



      <MyUniverseModal
        isOpen={isMyUniverseOpen}
        onClose={() => setIsMyUniverseOpen(false)}
        mypageStar={mypageStar}
        dailyPlanets={dailyPlanets}
        deepStars={deepStars}
        onDeepStarClick={(star) => { setIsMyUniverseOpen(false); void openDeepReport(star as any); }}
      />

      {/* 3D씬에서 비중심 심층별 클릭 시 직접 리포트 모달 */}
      {selectedDeepStar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedDeepStar(null); }}
        >
          <div className="relative mx-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            {/* 헤더 */}
            <div className="relative px-8 pt-7 pb-5 flex-shrink-0">
              <div
                className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-3xl opacity-40"
                style={{ backgroundColor: selectedDeepStar.toneColor }}
              />
              <div className="flex items-center gap-3 relative z-10">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center ml-2 mr-2">
                  <div
                    className="h-8 w-8 rotate-45 rounded-sm shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${selectedDeepStar.toneColor}ff, ${selectedDeepStar.toneColor}88)`,
                      boxShadow: `0 0 15px ${selectedDeepStar.toneColor}66`
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Deep Star Report</p>
                  <h3 className="text-base font-bold text-slate-100 truncate mt-0.5">{selectedDeepStar.deepType || "HTP"} 심층 분석</h3>
                </div>
                <button
                  onClick={() => setSelectedDeepStar(null)}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar space-y-6">
              {reportLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative h-14 w-14">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30" />
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-400" />
                  </div>
                  <p className="mt-4 text-sm text-slate-400">리포트 불러오는 중...</p>
                </div>
              ) : reportError ? (
                <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-6 text-center">
                  <p className="text-sm text-rose-200">{reportError}</p>
                </div>
              ) : (
                <>
                  {/* 기록 일시 + 별 시각화 요약 상단 */}
                  <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div
                      className="h-14 w-14 shrink-0 rotate-45 rounded-sm"
                      style={{
                        background: `linear-gradient(135deg, ${selectedDeepStar.toneColor}ff, ${selectedDeepStar.toneColor}88)`,
                        boxShadow: `0 0 30px ${selectedDeepStar.toneColor}66`
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold text-white">{selectedDeepStar.deepType || "HTP"} 심층 분석</p>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {(() => {
                          const d = new Date(selectedDeepStar.createdAt);
                          if (isNaN(d.getTime())) return "날짜 정보 없음";
                          return formatDateTimeKST(selectedDeepStar.createdAt);
                        })()}
                      </p>
                    </div>
                    {/* WHO-5 뱃지 (있으면) */}
                    {Array.isArray(selectedDeepStar.psychAssessments) && selectedDeepStar.psychAssessments.length > 0 && (
                      <div className="shrink-0 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">WHO-5</p>
                        <p className="text-2xl font-bold text-indigo-300">{selectedDeepStar.psychAssessments[0].scoreTotal}<span className="text-sm text-slate-500">/25</span></p>
                      </div>
                    )}
                  </div>

                  {/* HTP 제출 이미지 (크게) */}
                  {Array.isArray(selectedDeepStar.submissions) && selectedDeepStar.submissions.length > 0 && (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">제출된 그림</p>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedDeepStar.submissions.map((sub: any, i: number) => (
                          <div key={i} className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
                            <div className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-0.5 backdrop-blur-sm">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">{sub.type}</span>
                            </div>
                            {sub.imageKey ? (
                              <img
                                src={buildPublicImageUrl(sub.imageKey)}
                                alt={sub.type}
                                className="aspect-square w-full object-contain bg-white/5 p-2"
                                onError={(e) => {
                                  const t = e.target as HTMLImageElement;
                                  t.style.display = 'none';
                                  const ph = document.createElement('div');
                                  ph.className = 'aspect-square w-full flex flex-col items-center justify-center gap-2 bg-slate-800/50 p-4';
                                  ph.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;color:#475569"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span style="font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.1em">${sub.type}</span><span style="font-size:10px;color:#94a3b8">이미지 접근 권한 없음</span>`;
                                  t.parentElement?.appendChild(ph);
                                }}
                              />
                            ) : (
                              <div className="aspect-square w-full flex flex-col items-center justify-center gap-2 bg-slate-800/50 p-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7 text-slate-600"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                                <span className="text-[10px] uppercase text-slate-500 tracking-wider">{sub.type}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI 분석 리포트 */}
                  <div className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.08] to-transparent p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">AI 분석 리포트</p>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {selectedDeepStar.aiSummary || "심층 분석 결과가 아직 준비되지 않았습니다."}
                    </p>
                  </div>

                  {/* 추천 질문 */}
                  {Array.isArray(selectedDeepStar.questions) && selectedDeepStar.questions.length > 0 && (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">추천 질문</p>
                      <ul className="space-y-2">
                        {selectedDeepStar.questions.slice(0, 5).map((q: string, idx: number) => (
                          <li key={`${idx}-${q}`} className="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-400">{idx + 1}</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* WHO-5 심리검사 상세 */}
                  {Array.isArray(selectedDeepStar.psychAssessments) && selectedDeepStar.psychAssessments.length > 0 && (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">심리검사 결과</p>
                      {selectedDeepStar.psychAssessments.map((pa: any, idx: number) => {
                        const pct = Math.min(100, (pa.scoreTotal / 25) * 100);
                        const level = pct >= 72 ? "양호" : pct >= 52 ? "보통" : "주의";
                        const barColor = pct >= 72 ? "bg-emerald-400" : pct >= 52 ? "bg-amber-400" : "bg-rose-400";
                        return (
                          <div key={idx} className="mb-2 last:mb-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-300">{pa.testCode || "WHO-5"}</span>
                              <span className="text-xs text-slate-400">{level} · {pa.scoreTotal}점</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 데일리 행성 클릭 시 리포트 모달 */}
      {isDailyReportOpen && selectedDailyPlanet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsDailyReportOpen(false); setSelectedDailyPlanet(null); } }}
        >
          <div className="relative mx-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            {/* 헤더 */}
            <div className="relative px-8 pt-7 pb-5 flex-shrink-0">
              <div
                className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-3xl opacity-40"
                style={{ backgroundColor: selectedDailyPlanet.shell }}
              />
              <div className="flex items-center gap-3 relative z-10">
                {/* 데일리 헤더 아이콘: 다이아몬드 + 고리 */}
                <div className="relative flex-shrink-0 h-12 w-12 flex items-center justify-center ml-1 mx-2">
                  <div
                    className="absolute h-9 w-9 rotate-45 rounded-sm z-10"
                    style={{
                      background: `linear-gradient(135deg, ${selectedDailyPlanet.shell}ff, ${selectedDailyPlanet.core || selectedDailyPlanet.shell}88)`,
                      boxShadow: `0 0 15px ${selectedDailyPlanet.shell}66`,
                    }}
                  />
                  <div
                    className="absolute w-14 h-5 rounded-[100%] border-2"
                    style={{ borderColor: `${selectedDailyPlanet.shell}88`, transform: 'rotate(-15deg)' }}
                  />
                  <div
                    className="absolute w-14 h-5 rounded-[100%] border-t-2 border-transparent z-20"
                    style={{ borderBottomColor: `${selectedDailyPlanet.shell}aa`, transform: 'rotate(-15deg)' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Daily Report</p>
                  <h3 className="text-base font-bold text-slate-100 truncate mt-0.5">
                    {selectedDailyPlanet.memo?.slice(0, 24) || "데일리 행성"}
                  </h3>
                </div>
                <button
                  onClick={() => { setIsDailyReportOpen(false); setSelectedDailyPlanet(null); }}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-5">
              {/* 데일리 본문 시각화: 다이아몬드 + 큰 궤도 고리 */}
              <div className="relative flex justify-center py-8 my-2">
                <div
                  className="relative z-10 h-20 w-20 rotate-45 rounded-sm shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${selectedDailyPlanet.shell}ff, ${selectedDailyPlanet.core || selectedDailyPlanet.shell}88, ${selectedDailyPlanet.shell}33)`,
                    boxShadow: `0 0 40px ${selectedDailyPlanet.shell}66, 0 0 80px ${selectedDailyPlanet.shell}33`,
                  }}
                />
                {/* 뒤쪽 고리 반원 */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-12 rounded-[100%] border-4"
                  style={{ borderColor: `${selectedDailyPlanet.shell}66`, transform: 'translate(-50%, -50%) rotate(-15deg)' }}
                />
                {/* 앞쪽 고리 반원 (행성 위로 렌더링되도록 Z-index 높임) */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-12 rounded-[100%] border-t-4 border-transparent z-20"
                  style={{ borderBottomColor: `${selectedDailyPlanet.shell}cc`, transform: 'translate(-50%, -50%) rotate(-15deg)' }}
                />
              </div>
              {/* ── 분석 ── */}
              {(() => {
                const dailySummary = (selectedDailyPlanet as any).aiSummary || "데일리 AI 분석 결과가 아직 준비되지 않았습니다.";
                return (
                  <>
                    {/* 요약 */}
                    <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/5 to-white/[0.02] p-5">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-slate-400">✦ AI 분석 리포트</p>
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{dailySummary}</p>
                    </div>
                    {/* 색상 무드 */}
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">색채 에너지</p>
                      <p className="text-sm font-semibold text-slate-100 mb-1">{selectedDailyPlanet.shell}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">실제 감정 색상 데이터를 기반으로 표시됩니다.</p>
                    </div>
                  </>
                );
              })()}
              {/* 색상 정보 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Shell 색상</p>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: selectedDailyPlanet.shell }} />
                    <span className="text-xs text-slate-200 font-mono">{selectedDailyPlanet.shell}</span>
                  </div>
                </div>
                {selectedDailyPlanet.core && (
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Core 색상</p>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: selectedDailyPlanet.core }} />
                      <span className="text-xs text-slate-200 font-mono">{selectedDailyPlanet.core}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* 메모 */}
              {selectedDailyPlanet.memo && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오늘의 한 줄</p>
                  <p className="text-sm text-slate-200 leading-relaxed">"{selectedDailyPlanet.memo}"</p>
                </div>
              )}
              {/* 오브젝트 타입 */}
              {selectedDailyPlanet.objectType && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오브젝트 타입</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">{selectedDailyPlanet.objectType}</span>
                    {selectedDailyPlanet.objectColor && (
                      <div className="h-5 w-5 rounded-full" style={{ backgroundColor: selectedDailyPlanet.objectColor }} />
                    )}
                  </div>
                </div>
              )}
              {/* 날짜 */}
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">기록 일시</p>
                <p className="text-sm text-slate-200">{formatDateTimeKST(selectedDailyPlanet.createdAt)}</p>
              </div>
              {reportLoading && <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-xs text-slate-300">리포트 불러오는 중...</div>}
              {reportError && <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-xs text-rose-100">{reportError}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;