import { useState, useEffect } from "react";
import type { DailyPlanet, DeepStar } from "../../utils/homeHelpers";
import { formatDateTimeKST } from "../../utils/homeHelpers";

const DEEP_TYPE_LABELS: Record<string, string> = {
  HTP: "HTP",
  PERSON_IN_RAIN: "빗속의 사람",
  STAR_WAVE: "별-파도",
};

const COLOR_TO_EMOTION: Record<string, string> = {
  "#FFD54F": "기쁨", "#4FC3F7": "평온", "#FF6FAE": "설렘", "#66BB6A": "만족",
  "#5C6BC0": "슬픔", "#9575CD": "불안", "#EF5350": "분노", "#90A4AE": "지침",
};
const emotionFromColor = (hex: string) => COLOR_TO_EMOTION[hex.toUpperCase()] || hex;

interface StarSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  reportLoading: boolean;
  reportError: string | null;
  selectedDeepStar: (DeepStar & {
    aiSummary?: string;
    questions?: string[];
    submissions?: any[];
    psychAssessments?: any[];
    deepType?: string;
    status?: string;
  }) | null;
  selectedDailyPlanet: (DailyPlanet & { aiSummary?: string }) | null;
  deepPages?: any[];
  onRefresh?: () => void;
  onDeleteDaily?: (dailyId: number) => Promise<void> | void;
}

export function StarSidePanel({
  isOpen,
  onClose,
  reportLoading,
  reportError,
  selectedDeepStar,
  selectedDailyPlanet,
  deepPages = [],
  onRefresh,
  onDeleteDaily,
}: StarSidePanelProps) {
  const [pageIdx, setPageIdx] = useState(0);
  const [deletingDailyId, setDeletingDailyId] = useState<number | null>(null);

  // deepPages 갱신 시 사용자가 보던 탭을 유지하고, 범위를 벗어나면 마지막 탭으로 보정
  useEffect(() => {
    setPageIdx((prev) => {
      if (!deepPages.length) return 0;
      return Math.min(prev, deepPages.length - 1);
    });
  }, [deepPages.length]);

  // 새 리포트를 열 때는 요청한 세션 탭으로 이동
  useEffect(() => {
    const targetSessionId = Number((selectedDeepStar as any)?.targetId ?? 0);
    if (!targetSessionId || !deepPages.length) return;
    const idx = deepPages.findIndex((p: any) => Number(p?.sessionId) === targetSessionId);
    if (idx >= 0) setPageIdx(idx);
  }, [selectedDeepStar, deepPages]);

  // 분석 중인 페이지가 있으면 10초마다 자동 재조회
  const hasAnalyzing = deepPages.some(p => p.status === "ANALYZING" || p.status === "SUBMITTED");
  useEffect(() => {
    if (!isOpen || !hasAnalyzing || !onRefresh) return;
    // 패널을 연 직후 즉시 1회 재조회 + 이후 3초 주기 폴링
    void onRefresh();
    const id = window.setInterval(onRefresh, 3_000);
    return () => window.clearInterval(id);
  }, [isOpen, hasAnalyzing, onRefresh]);

  const isDeep = !!selectedDeepStar;
  const isDaily = !!selectedDailyPlanet && !selectedDeepStar;

  // 현재 페이지 데이터 (deepPages가 있으면 사용, 없으면 selectedDeepStar fallback)
  const currentPage = deepPages.length > 0
    ? deepPages[pageIdx] ?? deepPages[0]
    : selectedDeepStar
      ? {
          deepType: selectedDeepStar.deepType,
          createdAt: selectedDeepStar.createdAt,
          aiSummary: selectedDeepStar.aiSummary,
          submissions: selectedDeepStar.submissions,
          psychAssessments: selectedDeepStar.psychAssessments,
          status: selectedDeepStar.status,
        }
      : null;

  const who5Assessment = Array.isArray(currentPage?.psychAssessments)
    ? currentPage.psychAssessments.find((pa: any) => String(pa?.testCode ?? "").toUpperCase() === "WHO5")
    : null;

  const spaneAssessment = Array.isArray(currentPage?.psychAssessments)
    ? currentPage.psychAssessments.find((pa: any) => String(pa?.testCode ?? "").toUpperCase() === "SPANE")
    : null;

  const parseSpaneFromRaw = (raw: any) => {
    if (!raw || typeof raw !== "object") {
      return { positive: 0, negative: 0, balance: 0 };
    }
    const positive = Number(raw.scorePositive ?? raw.positive ?? 0);
    const negative = Number(raw.scoreNegative ?? raw.negative ?? 0);
    const balance = Number(raw.scoreBalance ?? raw.balance ?? (positive - negative));

    // raw에 answers만 있는 경우 계산 (정규 인덱스 적용)
    if (!positive && !negative && Array.isArray(raw.answers) && raw.answers.length >= 12) {
      const nums = raw.answers.map((v: any) => Number(v) || 0);
      const p = nums[0] + nums[2] + nums[4] + nums[6] + nums[9] + nums[11];
      const n = nums[1] + nums[3] + nums[5] + nums[7] + nums[8] + nums[10];
      return { positive: p, negative: n, balance: p - n };
    }

    return { positive, negative, balance };
  };

  const resolveDailyFallbackMessage = (status?: string) => {
    if (status === "FAILED") return "DAILY AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.";
    if (status === "PENDING" || status === "ANALYZING") return "DAILY AI 분석이 진행 중입니다. 잠시 후 다시 확인해주세요.";
    return "DAILY AI 분석 결과가 아직 준비되지 않았습니다.";
  };

  if (!isOpen) return null;

  /* ── 리포트 타입 라벨 ── */
  const reportLabel = isDeep
    ? deepPages.length > 1 ? "WEEKLY REPORT" : `${currentPage?.deepType ?? "HTP"} WEEKLY REPORT`
    : "DAILY REPORT";
  const reportTitle = isDeep
    ? deepPages.length > 1 ? "WEEKLY 분석" : `${DEEP_TYPE_LABELS[currentPage?.deepType] ?? currentPage?.deepType ?? "HTP"} WEEKLY 분석`
    : "감정 분석 리포트";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 왼쪽: 별이 보이는 투명 영역 — 클릭하면 닫힘 */}
      <button
        type="button"
        aria-label="close report"
        className="hidden md:block md:w-[30%] lg:w-[28%] flex-shrink-0 bg-transparent border-none cursor-default"
        onClick={onClose}
      />
      {/* 모바일에서는 전체 배경 클릭으로 닫기 */}
      <button
        type="button"
        aria-label="close report"
        className="md:hidden fixed inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* 오른쪽: 리포트 패널 */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-3 md:p-4 pointer-events-none">
        <div
          className="pointer-events-auto relative flex w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-white/[0.12] shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
          style={{
            height: "min(96vh, 960px)",
            background: "linear-gradient(165deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.96) 100%)",
            backdropFilter: "blur(40px) saturate(1.2)",
          }}
        >
          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between px-5 py-3 sm:px-7 sm:py-3.5 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                {isDeep ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-semibold">{reportLabel}</p>
                <h2 className="text-sm sm:text-base font-bold text-slate-100 mt-0.5">{reportTitle}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── 본문 ── */}
          <div
            className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4 sm:px-7 sm:py-4"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
          >
            <div className="flex flex-col gap-4">
              {/* 로딩 */}
              {reportLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-400/30 border-t-indigo-400" />
                  <p className="text-sm font-medium text-slate-300">리포트를 불러오는 중...</p>
                </div>
              )}

              {/* 에러 */}
              {reportError && !reportLoading && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300">
                  {reportError}
                </div>
              )}

              {/* ═══ DEEP STAR ═══ */}
              {isDeep && !reportLoading && !reportError && currentPage && (
                <>
                  {/* 검사별 탭 (2개 이상일 때만 표시) */}
                  {deepPages.length > 1 && (
                    <div className="flex gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
                      {deepPages.map((pg: any, i: number) => {
                        const isActive = i === pageIdx;
                        const isAnalyzing = pg.status === "ANALYZING" || pg.status === "SUBMITTED";
                        return (
                          <button
                            key={pg.sessionId}
                            type="button"
                            onClick={() => setPageIdx(i)}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                              isActive
                                ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                            }`}
                          >
                            {isAnalyzing && (
                              <span className="relative flex h-2 w-2 flex-shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                              </span>
                            )}
                            {DEEP_TYPE_LABELS[pg.deepType] ?? pg.deepType}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 타이틀 + WHO-5 */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-bold text-white">{DEEP_TYPE_LABELS[currentPage.deepType] ?? currentPage.deepType} 심층 분석</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {currentPage.createdAt ? formatDateTimeKST(currentPage.createdAt) : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {who5Assessment && typeof who5Assessment.scoreTotal === "number" && !who5Assessment.isSkipped && (
                        <div className="text-center flex-shrink-0 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/[0.12] px-4 py-2">
                          <p className="text-[9px] uppercase tracking-widest text-slate-500">WHO-5</p>
                          <p className="text-2xl font-bold text-indigo-300">
                            {who5Assessment.scoreTotal}
                            <span className="text-sm text-slate-500">/25</span>
                          </p>
                        </div>
                      )}
                      {spaneAssessment && !spaneAssessment.isSkipped && (
                        <div className="text-center flex-shrink-0 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.12] px-3 py-2">
                          <p className="text-[9px] uppercase tracking-widest text-slate-500">SPANE</p>
                          <div className="flex items-baseline gap-1.5 justify-center">
                            <span className="text-xl font-bold text-emerald-300">
                              {(() => {
                                const sp = parseSpaneFromRaw(spaneAssessment.raw);
                                const b = spaneAssessment.scoreBalance ?? sp.balance;
                                return b > 0 ? `+${b}` : b;
                              })()}
                            </span>
                          </div>
                          <p className="text-[8px] text-slate-500 mt-0.5">
                            {(() => {
                              const sp = parseSpaneFromRaw(spaneAssessment.raw);
                              const p = spaneAssessment.scorePositive ?? sp.positive;
                              const n = spaneAssessment.scoreNegative ?? sp.negative;
                              return `P ${p} · N ${n}`;
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 분석 중 상태 */}
                  {(currentPage.status === "ANALYZING" || currentPage.status === "SUBMITTED") && (
                    <div className="relative overflow-hidden rounded-2xl border border-indigo-400/20 p-8" style={{ background: "linear-gradient(160deg, rgba(79,70,229,0.12) 0%, rgba(17,24,39,0.95) 60%)" }}>
                      {/* 배경 글로우 효과 */}
                      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
                      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl" />

                      <div className="relative flex flex-col items-center text-center">
                        {/* 스피너 */}
                        <div className="relative mb-5">
                          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-indigo-400/30 border-t-indigo-400" style={{ animationDuration: "1.2s" }} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </div>
                        </div>

                        <p className="text-lg font-bold text-indigo-200">리포트 생성 중</p>
                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                          AI가 그림을 분석하고 있습니다<br />
                          <span className="text-slate-400">잠시만 기다려 주세요</span>
                        </p>

                        {/* 프로그레스 바 애니메이션 */}
                        <div className="mt-5 w-48 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[shimmer_2s_ease-in-out_infinite]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 제출된 그림 */}
                  {currentPage.status !== "ANALYZING" && currentPage.status !== "SUBMITTED" && Array.isArray(currentPage.submissions) && currentPage.submissions.length > 0 && (
                    <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">제출된 그림</p>
                      <div className={`grid gap-2.5 ${currentPage.submissions.length === 1 ? "grid-cols-1 max-w-[280px] mx-auto" : "grid-cols-3"}`}>
                        {currentPage.submissions.map((sub: any, i: number) => (
                          <div key={i} className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-slate-900/60">
                            <div className="absolute top-1.5 left-1.5 z-10 rounded bg-black/60 px-1.5 py-0.5">
                              <span className="text-[9px] font-bold uppercase text-slate-200">{sub.type}</span>
                            </div>
                            {sub.imageUrl ? (
                              <img src={sub.imageUrl} alt={sub.type} className="w-full aspect-square object-contain bg-white/[0.02] p-1" />
                            ) : (
                              <div className="flex aspect-square items-center justify-center bg-slate-800/50">
                                <span className="text-[10px] text-slate-500">{sub.type}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI 분석 */}
                  {currentPage.status !== "ANALYZING" && currentPage.status !== "SUBMITTED" && (
                    <div className="rounded-xl border border-indigo-400/[0.2] p-5" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), transparent)" }}>
                      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">AI 분석 리포트</p>
                      <p className="text-sm leading-7 text-slate-200 whitespace-pre-wrap">
                        {currentPage.aiSummary || "심층 분석 결과가 아직 준비되지 않았습니다."}
                      </p>
                    </div>
                  )}

                  {/* WHO-5 상세 */}
                  {Array.isArray(currentPage.psychAssessments) && currentPage.psychAssessments.some((pa: any) => !pa.isSkipped) && (
                    <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">심리검사 결과</p>
                      {currentPage.psychAssessments.filter((pa: any) => !pa.isSkipped).map((pa: any, idx: number, filtered: any[]) => {
                        const testCode = String(pa?.testCode ?? "").toUpperCase();
                        const isSpane = testCode === "SPANE";

                        const scoreTotal = Number(pa?.scoreTotal ?? 0);
                        const spaneParsed = parseSpaneFromRaw(pa?.raw);
                        const scorePositive = Number(pa?.scorePositive ?? spaneParsed.positive ?? 0);
                        const scoreNegative = Number(pa?.scoreNegative ?? spaneParsed.negative ?? 0);
                        const scoreBalance = Number(pa?.scoreBalance ?? spaneParsed.balance ?? (scorePositive - scoreNegative));

                        const pct = isSpane
                          ? Math.max(0, Math.min(100, ((scoreBalance + 24) / 48) * 100))
                          : Math.min(100, (scoreTotal / 25) * 100);
                        const level = pct >= 72 ? "양호" : pct >= 52 ? "보통" : "주의";
                        const barColor = pct >= 72 ? "#34d399" : pct >= 52 ? "#fbbf24" : "#fb7185";

                        const scoreLabel = isSpane
                          ? (scorePositive || scoreNegative
                            ? `긍정 ${scorePositive} · 부정 ${scoreNegative} · 균형 ${scoreBalance}`
                            : "점수 계산 중")
                          : `${scoreTotal}점`;

                        return (
                          <div key={idx} className={idx < filtered.length - 1 ? "mb-2.5" : ""}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-300">{testCode || "WHO-5"}</span>
                              <span className="text-xs text-slate-400">{level} · {scoreLabel}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ background: barColor, width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ═══ DAILY PLANET ═══ */}
              {isDaily && !reportLoading && !reportError && selectedDailyPlanet && (
                <>
                  {/* 그림 이미지 */}
                  {selectedDailyPlanet.drawingImageUrl && (
                    <div className="rounded-xl border border-white/[0.12] overflow-hidden">
                      <img
                        src={selectedDailyPlanet.drawingImageUrl}
                        alt="오늘의 그림"
                        className="w-full object-contain max-h-64 bg-white/5"
                      />
                    </div>
                  )}

                  {/* 기록 일시 + 감정 */}
                  <div className="flex items-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3">
                    <div className="h-10 w-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: selectedDailyPlanet.shell + "22" }}>
                      <div className="h-5 w-5 rounded-md" style={{ backgroundColor: selectedDailyPlanet.shell }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{emotionFromColor(selectedDailyPlanet.shell)}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatDateTimeKST(selectedDailyPlanet.createdAt)}</p>
                    </div>
                    {onDeleteDaily && (
                      <button
                        type="button"
                        onClick={async () => {
                          const dailyId = Number((selectedDailyPlanet as any).targetId ?? selectedDailyPlanet.id ?? 0);
                          if (!dailyId) return;
                          const ok = window.confirm("이 데일리 리포트를 삭제하시겠습니까?");
                          if (!ok) return;
                          try {
                            setDeletingDailyId(dailyId);
                            await onDeleteDaily(dailyId);
                          } finally {
                            setDeletingDailyId(null);
                          }
                        }}
                        disabled={deletingDailyId === Number((selectedDailyPlanet as any).targetId ?? selectedDailyPlanet.id ?? 0)}
                        className="h-9 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        {deletingDailyId === Number((selectedDailyPlanet as any).targetId ?? selectedDailyPlanet.id ?? 0) ? "삭제 중..." : "삭제"}
                      </button>
                    )}
                  </div>

                  {/* AI 인사이트 */}
                  <div className="rounded-xl border border-white/[0.12] p-5" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))" }}>
                    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">✦ 오늘의 감정 인사이트</p>
                    <p className="text-sm leading-7 text-slate-200 whitespace-pre-wrap">
                      {(selectedDailyPlanet as any).aiSummary
                        || resolveDailyFallbackMessage((selectedDailyPlanet as any).analysisStatus)}
                    </p>
                  </div>

                  {/* 메모 */}
                  {selectedDailyPlanet.memo && (
                    <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-5">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">오늘의 기록</p>
                      <p className="text-sm leading-6 text-slate-200 italic">"{selectedDailyPlanet.memo}"</p>
                    </div>
                  )}

                  {/* 오브젝트 타입 */}
                  {selectedDailyPlanet.objectType && (
                    <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">오브젝트 타입</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs rounded-full bg-sky-400/[0.1] text-sky-300 px-2.5 py-0.5">{selectedDailyPlanet.objectType}</span>
                        {selectedDailyPlanet.objectColor && (
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedDailyPlanet.objectColor }} />
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
