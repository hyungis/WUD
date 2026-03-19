import React from "react";
import type { DeepDetailResponse } from "../../../types/deep";

interface SingleDrawResultViewProps {
  result: DeepDetailResponse;
  reportLabel: string;
  onRestart: () => void;
  onComplete: () => void;
  saveError?: string | null;
  isAnalyzing?: boolean;
}

const SingleDrawResultView: React.FC<SingleDrawResultViewProps> = ({
  result,
  reportLabel,
  onRestart,
  onComplete,
  saveError,
  isAnalyzing = false,
}) => {

  const normalizeDeepReportText = (text?: string) => {
    if (!text) return "";
    return text
      .replace(/\r/g, "")
      .replace(/\n\s*\d+\s*\n\s*(\d+\.)/g, "\n$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const resultText = normalizeDeepReportText(result.aiResult.result || result.aiResult.resultSummary || "");

  const parseResult = (text: string) => {
    if (!text) return { summary: "", insights: [] };
    const sections = text.split(/(?:Core Insights|핵심 인사이트)/i);
    const summary = sections[0].trim();
    const insightsPart = sections[1] || "";
    const insights = insightsPart
      .split(/\n(?=\d+\.)/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
    return { summary, insights };
  };

  const { summary, insights } = parseResult(resultText);

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-700">
      <div className="flex-1 space-y-8 overflow-y-auto px-1 pb-6 custom-scrollbar">
        {/* Header */}
        <section className="text-center">
          <div className="inline-block rounded-full bg-indigo-500/10 px-3 py-1 ring-1 ring-indigo-400/30">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">{reportLabel}</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold text-white tracking-tight">
            {isAnalyzing ? "AI가 분석 중입니다..." : "당신의 내면 세계"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isAnalyzing
              ? "그림 속에 담긴 당신의 마음을 읽고 있습니다. 잠시만 기다려주세요."
              : "그림 속에 담긴 무의식의 메시지를 확인해 보세요."}
          </p>
        </section>

        {isAnalyzing ? (
          <section className="flex flex-col items-center justify-center py-16">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-400" />
            </div>
            <p className="mt-6 text-sm text-slate-400 animate-pulse">분석이 진행 중입니다...</p>
          </section>
        ) : (
          <>
            {/* Summary */}
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent p-8 shadow-2xl backdrop-blur-md">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />
              <div className="relative z-10">
                <p className="text-lg leading-relaxed text-slate-200 text-center font-medium italic">
                  &ldquo;{summary || "분석 결과를 생성하는 중입니다..."}&rdquo;
                </p>
              </div>
            </section>

            {/* Insights */}
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Core Insights</h3>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {insights.length > 0 ? (
                  insights.map((insight, idx) => (
                    <div key={idx} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/[0.05]">
                      <div className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/40 transition-transform group-hover:scale-110">
                          {idx + 1}
                        </span>
                        <p className="text-sm leading-relaxed text-slate-300 group-hover:text-slate-100 italic transition-colors">
                          {insight.replace(/^\d+\.\s*/, "")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center text-slate-500 italic">
                    상세 인사이트를 불러올 수 없습니다.
                  </div>
                )}
              </div>
            </section>

            {/* Drawing preview */}
            {result.submissions && result.submissions.length > 0 && (
              <section>
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Your Drawing</h3>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </div>
                <div className="flex justify-center pb-4">
                  {result.submissions.map((sub, i) => (
                    <div key={i} className="group relative aspect-square w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 transition-transform hover:scale-[1.02]">
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl z-10">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{sub.type}</span>
                      </div>
                      {sub.imageUrl ? (
                        <img src={sub.imageUrl} alt={sub.type}
                          className="h-full w-full object-contain rounded-xl bg-slate-800/50"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-800/50 flex items-center justify-center rounded-xl text-xs text-slate-500">
                          {sub.type}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto shrink-0 border-t border-white/5 bg-slate-950/40 pt-6 backdrop-blur-xl">
        {saveError && (
          <p className="mb-4 text-center text-xs font-medium text-amber-400 animate-pulse">{saveError}</p>
        )}
        <div className="flex items-center justify-center gap-4">
          <button type="button" onClick={onRestart} disabled={isAnalyzing}
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40">
            그림 다시 보기
          </button>
          <button type="button" onClick={onComplete} disabled={isAnalyzing}
            className="relative flex items-center justify-center overflow-hidden rounded-xl bg-indigo-600 px-10 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] active:scale-95 disabled:opacity-40">
            {isAnalyzing ? "분석 중..." : "별 확인하러 가기"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingleDrawResultView;
