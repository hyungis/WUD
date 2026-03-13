import type { DailyPlanet, DeepStar } from "../../utils/homeHelpers";
import { formatDateTimeKST } from "../../utils/homeHelpers";

interface StarSidePanelProps {
  // 공통: 패널이 열려있는지 여부
  isOpen: boolean;
  onClose: () => void;
  reportLoading: boolean;
  reportError: string | null;
  // deep star 리포트
  selectedDeepStar: (DeepStar & {
    aiSummary?: string;
    questions?: string[];
    submissions?: any[];
    psychAssessments?: any[];
    deepType?: string;
    status?: string;
  }) | null;
  // daily planet 리포트
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

  return (
    <div
      className={`fixed z-30 top-24 h-[50vh] w-80 flex flex-col
        rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur-md shadow-2xl
        transition-all duration-500 ease-in-out overflow-hidden
        ${isOpen
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 translate-x-4 pointer-events-none"
        }`}
      style={{ right: "calc(1.5rem + 18rem + 0.75rem)" }}
    >
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
          {isDeep ? `${selectedDeepStar?.deepType ?? "HTP"} Deep Report` : "Daily Report"}
        </p>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition hover:bg-white/10 text-slate-400 hover:text-white"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── 바디 ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">

        {/* 로딩 */}
        {reportLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-3" />
            <p className="text-xs">리포트 불러오는 중...</p>
          </div>
        )}

        {/* 에러 */}
        {reportError && !reportLoading && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-xs text-rose-200">
            {reportError}
          </div>
        )}

        {/* ── DEEP STAR 리포트 ── */}
        {isDeep && !reportLoading && !reportError && (
          <>
            {/* 날짜 + WHO-5 */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-white">{selectedDeepStar?.deepType ?? "HTP"} 심층 분석</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {selectedDeepStar?.createdAt ? formatDateTimeKST(selectedDeepStar.createdAt) : ""}
                </p>
              </div>
              {Array.isArray(selectedDeepStar?.psychAssessments) && selectedDeepStar!.psychAssessments!.length > 0 && (
                <div className="text-center flex-shrink-0">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">WHO-5</p>
                  <p className="text-lg font-bold text-indigo-300">
                    {selectedDeepStar!.psychAssessments![0].scoreTotal}
                    <span className="text-xs text-slate-500">/25</span>
                  </p>
                </div>
              )}
            </div>

            {/* HTP 제출 이미지 */}
            {Array.isArray(selectedDeepStar?.submissions) && selectedDeepStar!.submissions!.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-3">제출된 그림</p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedDeepStar!.submissions!.map((sub: any, i: number) => (
                    <div key={i} className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-900/60">
                      <div className="absolute top-1 left-1 z-10 rounded bg-black/60 px-1 py-0.5">
                        <span className="text-[8px] font-bold uppercase text-slate-200">{sub.type}</span>
                      </div>
                      {sub.imageUrl ? (
                        <img src={sub.imageUrl} alt={sub.type} className="aspect-square w-full object-contain bg-white/5 p-1" />
                      ) : (
                        <div className="aspect-square flex items-center justify-center bg-slate-800/50">
                          <span className="text-[8px] text-slate-500">{sub.type}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI 분석 */}
            <div className="rounded-xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.08] to-transparent p-4">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-indigo-300">AI 분석 리포트</p>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedDeepStar?.aiSummary || "심층 분석 결과가 아직 준비되지 않았습니다."}
              </p>
            </div>

            {/* WHO-5 상세 */}
            {Array.isArray(selectedDeepStar?.psychAssessments) && selectedDeepStar!.psychAssessments!.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-3">심리검사 결과</p>
                {selectedDeepStar!.psychAssessments!.map((pa: any, idx: number) => {
                  const pct = Math.min(100, (pa.scoreTotal / 25) * 100);
                  const level = pct >= 72 ? "양호" : pct >= 52 ? "보통" : "주의";
                  const barColor = pct >= 72 ? "bg-emerald-400" : pct >= 52 ? "bg-amber-400" : "bg-rose-400";
                  return (
                    <div key={idx} className="mb-2 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-300">{pa.testCode ?? "WHO-5"}</span>
                        <span className="text-[10px] text-slate-400">{level} · {pa.scoreTotal}점</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── DAILY PLANET 리포트 ── */}
        {isDaily && !reportLoading && !reportError && selectedDailyPlanet && (
          <>
            {/* 행성 비주얼 */}
            <div className="relative flex justify-center py-4">
              <div
                className="relative z-10 h-14 w-14 rotate-45 rounded-sm shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${selectedDailyPlanet.shell}ff, ${selectedDailyPlanet.core || selectedDailyPlanet.shell}88)`,
                  boxShadow: `0 0 30px ${selectedDailyPlanet.shell}55`,
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-28 h-9 rounded-[100%] border-2"
                style={{ borderColor: `${selectedDailyPlanet.shell}66`, transform: "translate(-50%,-50%) rotate(-15deg)" }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-28 h-9 rounded-[100%] border-t-2 border-transparent z-20"
                style={{ borderBottomColor: `${selectedDailyPlanet.shell}aa`, transform: "translate(-50%,-50%) rotate(-15deg)" }}
              />
            </div>

            {/* 기록 일시 */}
            <div className="rounded-xl border border-white/8 bg-white/5 p-3">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">기록 일시</p>
              <p className="text-xs text-slate-200">{formatDateTimeKST(selectedDailyPlanet.createdAt)}</p>
            </div>

            {/* AI 분석 */}
            <div className="rounded-xl border border-white/8 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
              <p className="mb-2 text-[9px] uppercase tracking-widest text-slate-400">✦ AI 분석 리포트</p>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {(selectedDailyPlanet as any).aiSummary || "데일리 AI 분석 결과가 아직 준비되지 않았습니다."}
              </p>
            </div>

            {/* 색상 정보 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/8 bg-white/5 p-3">
                <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-2">Shell 색상</p>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md flex-shrink-0" style={{ backgroundColor: selectedDailyPlanet.shell }} />
                  <span className="text-[10px] text-slate-200 font-mono truncate">{selectedDailyPlanet.shell}</span>
                </div>
              </div>
              {selectedDailyPlanet.core && (
                <div className="rounded-xl border border-white/8 bg-white/5 p-3">
                  <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-2">Core 색상</p>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-md flex-shrink-0" style={{ backgroundColor: selectedDailyPlanet.core }} />
                    <span className="text-[10px] text-slate-200 font-mono truncate">{selectedDailyPlanet.core}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 메모 */}
            {selectedDailyPlanet.memo && (
              <div className="rounded-xl border border-white/8 bg-white/5 p-4">
                <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-2">오늘의 한 줄</p>
                <p className="text-xs text-slate-200 leading-relaxed">"{selectedDailyPlanet.memo}"</p>
              </div>
            )}

            {/* 오브젝트 타입 */}
            {selectedDailyPlanet.objectType && (
              <div className="rounded-xl border border-white/8 bg-white/5 p-3">
                <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-2">오브젝트 타입</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">
                    {selectedDailyPlanet.objectType}
                  </span>
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
  );
}
