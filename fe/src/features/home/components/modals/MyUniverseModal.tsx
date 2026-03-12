import { useEffect, useState } from "react";
import type { DailyPlanet, DeepStar } from "../../utils/homeHelpers";
import { getWeekKey, formatDate, formatDateTimeKST } from "../../utils/homeHelpers";

interface MyUniverseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mypageStar: { id: string; toneColor: string; label: string; createdAt: string };
  dailyPlanets: DailyPlanet[];
  deepStars: DeepStar[];
  onDeepStarClick: (star: DeepStar) => void;
}

export function MyUniverseModal({
  isOpen,
  onClose,
  mypageStar,
  dailyPlanets,
  deepStars,
  onDeepStarClick,
}: MyUniverseModalProps) {
  const [tab, setTab] = useState<"overview" | "daily" | "deep">("overview");
  const [selectedItem, setSelectedItem] = useState<{ type: "daily"; data: DailyPlanet } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab("overview");
      setSelectedItem(null);
    }
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
    ...dailyPlanets.map((p) => getWeekKey(new Date(p.createdAt))),
    ...deepStars.map((s) => s.weekKey || getWeekKey(new Date(s.createdAt))),
  ]).size;

  const TABS = [
    { key: "overview" as const, label: "개요" },
    { key: "daily" as const, label: `데일리 (${dailyPlanets.length})` },
    { key: "deep" as const, label: `심층 (${deepStars.length})` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
              style={{
                backgroundColor: mypageStar.toneColor + "33",
                border: `1px solid ${mypageStar.toneColor}55`,
              }}
            >
              <div
                className="h-6 w-6 rotate-45 rounded-sm"
                style={{ backgroundColor: mypageStar.toneColor }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-1">My Universe</p>
              <h2 className="text-xl font-bold text-slate-100 truncate">{mypageStar.label}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                총 {totalRecords}개 기록 · {uniqueWeeks}주
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 mt-5 rounded-xl bg-white/5 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setSelectedItem(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all duration-200 ${
                  tab === t.key ? "bg-white/15 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
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
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/5 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-100">
                      {stat.value}
                      <span className="text-sm font-normal text-slate-400 ml-0.5">{stat.unit}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* 나의 톤 */}
              <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-3">나의 감정 톤</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex-shrink-0"
                    style={{ backgroundColor: mypageStar.toneColor, boxShadow: `0 0 20px ${mypageStar.toneColor}66` }}
                  />
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
                      ...dailyPlanets.map((p) => ({
                        type: "daily" as const,
                        id: p.id,
                        color: p.shell,
                        label: p.memo || "데일리 기록",
                        date: p.createdAt,
                        raw: p,
                      })),
                      ...deepStars.map((s) => ({
                        type: "deep" as const,
                        id: s.id,
                        color: s.toneColor,
                        label: s.label || "심층 기록",
                        date: s.createdAt,
                        raw: s,
                      })),
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((item, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            item.type === "daily"
                              ? setSelectedItem({ type: "daily", data: item.raw as DailyPlanet })
                              : onDeepStarClick(item.raw as any)
                          }
                          className="w-full flex items-center gap-3 rounded-xl hover:bg-white/5 px-2 py-1.5 transition-colors text-left"
                        >
                          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="flex-1 text-xs text-slate-300 truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">{formatDate(item.date)}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              item.type === "deep" ? "bg-violet-500/20 text-violet-300" : "bg-sky-500/20 text-sky-300"
                            }`}
                          >
                            {item.type === "deep" ? "심층" : "데일리"}
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-3 w-3 text-slate-600 flex-shrink-0"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      ))}
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
                            background: `linear-gradient(135deg, ${planet.shell}ee, ${
                              planet.core || planet.shell
                            }88)`,
                            boxShadow: `0 0 10px ${planet.shell}66`,
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-200 truncate">
                            {planet.memo ? planet.memo.slice(0, 30) + (planet.memo.length > 30 ? "…" : "") : "데일리 행성"}
                          </span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">
                            {formatDate(planet.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">데일리</span>
                          {planet.objectType && <span className="text-[10px] text-slate-500">{planet.objectType}</span>}
                        </div>
                      </div>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4 text-slate-600 flex-shrink-0 mt-2"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
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
                          <span className="text-[10px] text-slate-500 flex-shrink-0">
                            {formatDate(star.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300">HTP</span>
                          {star.weekKey && <span className="text-[10px] text-slate-500">{star.weekKey}</span>}
                        </div>
                      </div>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4 text-slate-600 flex-shrink-0 mt-2"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedItem(null);
          }}
        >
          <div className="relative mx-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            {/* 리포트 헤더 */}
            <div className="relative px-8 pt-7 pb-5 flex-shrink-0">
              <div
                className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-3xl opacity-40"
                style={{
                  backgroundColor:
                    selectedItem.type === "daily" ? selectedItem.data.shell : (selectedItem.data as any).toneColor,
                }}
              />
              <div className="flex items-center gap-3 relative z-10">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  aria-label="뒤로"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                    {selectedItem.type === "daily" ? "Daily Report" : "Deep Star Report"}
                  </p>
                  <h3 className="text-base font-bold text-slate-100 truncate mt-0.5">
                    {selectedItem.type === "daily"
                      ? selectedItem.data.memo?.slice(0, 24) || "데일리 행성"
                      : (selectedItem.data as any).label || "심층 별"}
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
              {selectedItem.type === "daily" &&
                (() => {
                  const p = selectedItem.data;
                  return (
                    <>
                      {/* 행성 시각화: 정팔면체(octahedron) 투영 */}
                      <div className="flex justify-center py-6">
                        <div className="relative flex items-center justify-center">
                          <div
                            className="h-24 w-24 rotate-45 rounded-lg shadow-2xl"
                            style={{
                              background: `linear-gradient(135deg, ${p.shell}ff, ${p.core || p.shell}99, ${
                                p.shell
                              }cc)`,
                              boxShadow: `0 0 40px ${p.shell}88, 0 0 80px ${p.shell}44`,
                            }}
                          />
                          {/* 내부 하이라이트 */}
                          <div
                            className="absolute h-6 w-6 rotate-45 rounded-sm opacity-60"
                            style={{ backgroundColor: "#ffffff", top: "22%", left: "26%" }}
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
                            <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">
                              {p.objectType}
                            </span>
                            {p.objectColor && (
                              <div className="h-5 w-5 rounded-full" style={{ backgroundColor: p.objectColor }} />
                            )}
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
