import React from "react";
import type { DeepDetailResponse } from "../../../types/deep";

interface HTPResultViewProps {
  result: DeepDetailResponse;
  onRestart: () => void;
  onComplete: () => void;
  saveError?: string | null;
}

const HTPResultView: React.FC<HTPResultViewProps> = ({ 
  result, 
  onRestart, 
  onComplete, 
  saveError
}) => {
  const S3_BASE_URL = "https://wud-s3.s3.ap-northeast-2.amazonaws.com";
  const resultText = result.aiResult.result || result.aiResult.resultSummary || "";

  // 개선된 파싱 로직: 여러 구분자에 대응
  const parseResult = (text: string) => {
    if (!text) return { summary: "", insights: [] };

    // 인사이트 섹션 구분자 찾기
    const sections = text.split(/(?:Core Insights|핵심 인사이트|Insight)/i);
    const summary = sections[0].trim();
    const insightsPart = sections[1] || "";
    
    // 숫자+점 조합 또는 불렛 포인트를 기준으로 항목 분리
    const insights = insightsPart
      .split(/(?:\d+\.|\*|\-)/)
      .map(s => s.trim())
      .filter(s => s.length > 5); // 너무 짧은 문자열 제외

    return { summary, insights };
  };

  const { summary, insights } = parseResult(resultText);

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-700">
      <div className="flex-1 space-y-8 overflow-y-auto px-1 pb-6 custom-scrollbar">
        {/* Header Section */}
        <section className="text-center">
          <div className="inline-block rounded-full bg-indigo-500/10 px-3 py-1 ring-1 ring-indigo-400/30">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">HTP Analysis Report</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold text-white tracking-tight">당신의 내면 세계</h2>
          <p className="mt-2 text-sm text-slate-400">그림 속에 담긴 무의식의 메시지를 확인해 보세요.</p>
        </section>

        {/* Summary Card */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent p-8 shadow-2xl backdrop-blur-md">
           <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />
           <div className="relative z-10">
             <p className="text-lg leading-relaxed text-slate-200 text-center font-medium italic">
               "{summary || "분석 결과를 생성하는 중입니다..."}"
             </p>
           </div>
        </section>

        {/* Insights Grid */}
        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Core Insights</h3>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {insights.length > 0 ? (
              insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/[0.05]"
                >
                  <div className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/40 transition-transform group-hover:scale-110">
                      {idx + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-slate-300 group-hover:text-slate-100 italic transition-colors">
                      {insight}
                    </p>
                  </div>
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/0 via-transparent to-indigo-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-10" />
                </div>
              ))
            ) : (
              <div className="col-span-full py-10 text-center text-slate-500 italic">
                상세 인사이트를 불러올 수 없습니다.
              </div>
            )}
          </div>
        </section>

        {/* Mini Images View */}
        {result.submissions && result.submissions.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Your Drawings</h3>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>
            <div className="flex justify-center gap-4 overflow-x-auto pb-4">
               {result.submissions.map((sub, i) => (
                <div key={i} className="group relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 transition-transform hover:scale-105 hover:z-10">
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white uppercase">{sub.type}</span>
                    </div>
                    {sub.imageKey ? (
                      <img 
                        src={`${S3_BASE_URL}/${sub.imageKey}`} 
                        alt={sub.type}
                        className="h-full w-full object-contain rounded-lg bg-slate-800/50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML += '<div class="h-full w-full flex items-center justify-center text-[10px] text-slate-500 uppercase">' + sub.type + '</div>';
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-800/50 flex items-center justify-center text-[10px] text-slate-500">
                        {sub.type}
                      </div>
                    )}
                 </div>
               ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-auto shrink-0 border-t border-white/5 bg-slate-950/40 pt-6 backdrop-blur-xl">
        {saveError && (
          <p className="mb-4 text-center text-xs font-medium text-amber-400 animate-pulse">{saveError}</p>
        )}
        <div className="flex items-center justify-center gap-4">
          <button 
            type="button" 
            onClick={onRestart}
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
          >
            그림 다시 보기
          </button>
          <button 
            type="button" 
            onClick={onComplete}
            className="relative flex items-center justify-center overflow-hidden rounded-xl bg-indigo-600 px-10 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] active:scale-95"
          >
            분석 완료 및 별 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default HTPResultView;
