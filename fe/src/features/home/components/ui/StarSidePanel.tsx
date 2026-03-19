import type { DailyPlanet, DeepStar } from "../../utils/homeHelpers";
import { formatDateTimeKST } from "../../utils/homeHelpers";

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
}

export function StarSidePanel({
  isOpen,
  onClose,
  reportLoading,
  reportError,
  selectedDeepStar,
  selectedDailyPlanet,
}: StarSidePanelProps) {
  const isDeep = !!selectedDeepStar;
  const isDaily = !!selectedDailyPlanet && !selectedDeepStar;

  const resolveDailyFallbackMessage = (status?: string) => {
    if (status === "FAILED") return "데일리 AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.";
    if (status === "PENDING" || status === "ANALYZING") return "데일리 AI 분석이 진행 중입니다. 잠시 후 다시 확인해주세요.";
    return "데일리 AI 분석 결과가 아직 준비되지 않았습니다.";
  };

  if (!isOpen) return null;

  /* ── 리포트 타입 라벨 ── */
  const reportLabel = isDeep
    ? `${selectedDeepStar?.deepType ?? "HTP"} Deep Report`
    : "Daily Report";
  const reportTitle = isDeep
    ? `${selectedDeepStar?.deepType ?? "HTP"} 심층 분석`
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
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="mb-3 h-9 w-9 animate-spin rounded-full border-2 border-indigo-500/60 border-t-transparent" />
                  <p className="text-sm">리포트를 불러오는 중...</p>
                </div>
              )}

              {/* 에러 */}
              {reportError && !reportLoading && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300">
                  {reportError}
                </div>
              )}

              {/* ═══ DEEP STAR ═══ */}
              {isDeep && !reportLoading && !reportError && (
                <>
                  {/* 타이틀 + WHO-5 */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-bold text-white">{selectedDeepStar?.deepType ?? "HTP"} 심층 분석</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {selectedDeepStar?.createdAt ? formatDateTimeKST(selectedDeepStar.createdAt) : ""}
                      </p>
                    </div>
                    {Array.isArray(selectedDeepStar?.psychAssessments) && selectedDeepStar!.psychAssessments!.length > 0 && (
                      <div className="text-center flex-shrink-0 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/[0.12] px-4 py-2">
                        <p className="text-[9px] uppercase tracking-widest text-slate-500">WHO-5</p>
                        <p className="text-2xl font-bold text-indigo-300">
                          {selectedDeepStar!.psychAssessments![0].scoreTotal}
                          <span className="text-sm text-slate-500">/25</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* HTP 이미지 */}
                  {Array.isArray(selectedDeepStar?.submissions) && selectedDeepStar!.submissions!.length > 0 && (
                    <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">제출된 그림</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {selectedDeepStar!.submissions!.map((sub: any, i: number) => (
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
                  <div className="rounded-xl border border-indigo-400/[0.2] p-5" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), transparent)" }}>
                    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">AI 분석 리포트</p>
                    <p className="text-sm leading-7 text-slate-200 whitespace-pre-wrap">
                      {selectedDeepStar?.aiSummary || "심층 분석 결과가 아직 준비되지 않았습니다."}
                    </p>
                  </div>

                  {/* WHO-5 상세 */}
                  {Array.isArray(selectedDeepStar?.psychAssessments) && selectedDeepStar!.psychAssessments!.length > 0 && (
                    <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">심리검사 결과</p>
                      {selectedDeepStar!.psychAssessments!.map((pa: any, idx: number) => {
                        const pct = Math.min(100, (pa.scoreTotal / 25) * 100);
                        const level = pct >= 72 ? "양호" : pct >= 52 ? "보통" : "주의";
                        const barColor = pct >= 72 ? "#34d399" : pct >= 52 ? "#fbbf24" : "#fb7185";
                        return (
                          <div key={idx} className={idx < selectedDeepStar!.psychAssessments!.length - 1 ? "mb-2.5" : ""}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-300">{pa.testCode ?? "WHO-5"}</span>
                              <span className="text-xs text-slate-400">{level} · {pa.scoreTotal}점</span>
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
                  {/* 기록 일시 + 감정 */}
                  <div className="flex items-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3">
                    <div className="h-10 w-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: selectedDailyPlanet.shell + "22" }}>
                      <div className="h-5 w-5 rounded-md" style={{ backgroundColor: selectedDailyPlanet.shell }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{emotionFromColor(selectedDailyPlanet.shell)}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatDateTimeKST(selectedDailyPlanet.createdAt)}</p>
                    </div>
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
