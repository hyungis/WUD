import type { DeepStar } from "../../utils/homeHelpers";
import { formatDateTimeKST } from "../../utils/homeHelpers";

interface DeepReportModalProps {
  selectedDeepStar: (DeepStar & { aiSummary?: string; questions?: string[]; submissions?: any[]; psychAssessments?: any[]; deepType?: string; status?: string }) | null;
  setSelectedDeepStar: (star: any) => void;
  reportLoading: boolean;
  reportError: string | null;
}

export function DeepReportModal({
  selectedDeepStar,
  setSelectedDeepStar,
  reportLoading,
  reportError,
}: DeepReportModalProps) {
  if (!selectedDeepStar) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedDeepStar(null);
      }}
    >
      <div className="relative mx-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-6 pt-8">
          {reportLoading && !selectedDeepStar.aiSummary ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-4" />
              <p className="text-sm">심층 분석 리포트를 생성하고 있습니다...</p>
            </div>
          ) : reportError ? (
            <div className="py-20 text-center">
              <p className="text-rose-400 mb-4">{reportError}</p>
              <button
                onClick={() => setSelectedDeepStar(null)}
                className="px-6 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                닫기
              </button>
            </div>
          ) : (
            <>
              {/* 헤더 섹션 */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{selectedDeepStar.deepType || "HTP"} 심층 분석</p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {(() => {
                      const d = new Date(selectedDeepStar.createdAt);
                      if (isNaN(d.getTime())) return "날짜 정보 없음";
                      return formatDateTimeKST(selectedDeepStar.createdAt);
                    })()}
                  </p>
                </div>
                {/* WHO-5 뱃지 */}
                {Array.isArray(selectedDeepStar.psychAssessments) && selectedDeepStar.psychAssessments.length > 0 && (
                  <div className="shrink-0 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">WHO-5</p>
                    <p className="text-2xl font-bold text-indigo-300">
                      {selectedDeepStar.psychAssessments[0].scoreTotal}
                      <span className="text-sm text-slate-500">/25</span>
                    </p>
                  </div>
                )}
              </div>

              {/* HTP 제출 이미지 */}
              {Array.isArray(selectedDeepStar.submissions) && selectedDeepStar.submissions.length > 0 && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">제출된 그림</p>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedDeepStar.submissions.map((sub: any, i: number) => (
                      <div key={i} className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
                        <div className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-0.5 backdrop-blur-sm">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">{sub.type}</span>
                        </div>
                        {sub.imageUrl ? (
                          <img
                            src={sub.imageUrl}
                            alt={sub.type}
                            className="aspect-square w-full object-contain bg-white/5 p-3"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              t.style.display = "none";
                              const ph = document.createElement("div");
                              ph.className = "aspect-square w-full flex flex-col items-center justify-center gap-2 bg-slate-800/50 p-4";
                              ph.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;color:#475569"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span style="font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.1em">${sub.type}</span><span style="font-size:10px;color:#94a3b8">이미지 접근 권한 없음</span>`;
                              t.parentElement?.appendChild(ph);
                            }}
                          />
                        ) : (
                          <div className="aspect-square w-full flex flex-col items-center justify-center gap-2 bg-slate-800/50 p-4">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7 text-slate-600">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="m21 15-5-5L5 21" />
                            </svg>
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
                          <span className="text-xs text-slate-400">
                            {level} · {pa.scoreTotal}점
                          </span>
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
        {/* 푸터 닫기 버튼 */}
        <div className="border-t border-white/10 px-8 py-4 flex justify-end bg-slate-950/50 backdrop-blur-md">
          <button
            onClick={() => setSelectedDeepStar(null)}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
