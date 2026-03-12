import type { DailyPlanet } from "../../utils/homeHelpers";
import { formatDateTimeKST } from "../../utils/homeHelpers";

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  planet: DailyPlanet | null;
  reportLoading: boolean;
  reportError: string | null;
}

export function DailyReportModal({
  isOpen,
  onClose,
  planet,
  reportLoading,
  reportError,
}: DailyReportModalProps) {
  if (!isOpen || !planet) return null;

  const dailySummary = (planet as any).aiSummary || "데일리 AI 분석 결과가 아직 준비되지 않았습니다.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
        {/* 헤더 */}
        <div className="relative px-8 pt-7 pb-5 flex-shrink-0">
          <div
            className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-3xl opacity-40"
            style={{ backgroundColor: planet.shell }}
          />
          <div className="flex items-center gap-3 relative z-10">
            {/* 데일리 헤더 아이콘: 다이아몬드 + 고리 */}
            <div className="relative flex-shrink-0 h-12 w-12 flex items-center justify-center ml-1 mx-2">
              <div
                className="absolute h-9 w-9 rotate-45 rounded-sm z-10"
                style={{
                  background: `linear-gradient(135deg, ${planet.shell}ff, ${planet.core || planet.shell}88)`,
                  boxShadow: `0 0 15px ${planet.shell}66`,
                }}
              />
              <div
                className="absolute w-14 h-5 rounded-[100%] border-2"
                style={{ borderColor: `${planet.shell}88`, transform: "rotate(-15deg)" }}
              />
              <div
                className="absolute w-14 h-5 rounded-[100%] border-t-2 border-transparent z-20"
                style={{ borderBottomColor: `${planet.shell}aa`, transform: "rotate(-15deg)" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Daily Report</p>
              <h3 className="text-base font-bold text-slate-100 truncate mt-0.5">
                {planet.memo?.slice(0, 24) || "데일리 행성"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
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
                background: `linear-gradient(135deg, ${planet.shell}ff, ${planet.core || planet.shell}88, ${
                  planet.shell
                }33)`,
                boxShadow: `0 0 40px ${planet.shell}66, 0 0 80px ${planet.shell}33`,
              }}
            />
            {/* 뒤쪽 고리 반원 */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-12 rounded-[100%] border-4"
              style={{ borderColor: `${planet.shell}66`, transform: "translate(-50%, -50%) rotate(-15deg)" }}
            />
            {/* 앞쪽 고리 반원 (행성 위로 렌더링되도록 Z-index 높임) */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-12 rounded-[100%] border-t-4 border-transparent z-20"
              style={{ borderBottomColor: `${planet.shell}cc`, transform: "translate(-50%, -50%) rotate(-15deg)" }}
            />
          </div>
          {/* ── 분석 ── */}
          <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/5 to-white/[0.02] p-5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-slate-400">✦ AI 분석 리포트</p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{dailySummary}</p>
          </div>
          {/* 색상 무드 */}
          <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">색채 에너지</p>
            <p className="text-sm font-semibold text-slate-100 mb-1">{planet.shell}</p>
            <p className="text-xs text-slate-300 leading-relaxed">실제 감정 색상 데이터를 기반으로 표시됩니다.</p>
          </div>
          {/* 색상 정보 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Shell 색상</p>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: planet.shell }} />
                <span className="text-xs text-slate-200 font-mono">{planet.shell}</span>
              </div>
            </div>
            {planet.core && (
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Core 색상</p>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: planet.core }} />
                  <span className="text-xs text-slate-200 font-mono">{planet.core}</span>
                </div>
              </div>
            )}
          </div>
          {/* 메모 */}
          {planet.memo && (
            <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오늘의 한 줄</p>
              <p className="text-sm text-slate-200 leading-relaxed">"{planet.memo}"</p>
            </div>
          )}
          {/* 오브젝트 타입 */}
          {planet.objectType && (
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오브젝트 타입</p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">{planet.objectType}</span>
                {planet.objectColor && <div className="h-5 w-5 rounded-full" style={{ backgroundColor: planet.objectColor }} />}
              </div>
            </div>
          )}
          {/* 날짜 */}
          <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">기록 일시</p>
            <p className="text-sm text-slate-200">{formatDateTimeKST(planet.createdAt)}</p>
          </div>
          {reportLoading && (
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-xs text-slate-300">
              리포트 불러오는 중...
            </div>
          )}
          {reportError && (
            <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-xs text-rose-100">
              {reportError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
