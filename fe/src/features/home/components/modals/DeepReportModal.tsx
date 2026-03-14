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

  const starColor = selectedDeepStar.toneColor || "#818cf8";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedDeepStar(null);
      }}
    >
      <div
        className="relative mx-4 flex w-full flex-row overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
        style={{ maxWidth: "1280px", height: "85vh", maxHeight: "94vh" }}
      >
        {/* ── 왼쪽: 별 시각화 영역 (1/3) ── */}
        <div
          className="relative flex flex-col items-center justify-center border-r border-white/10 overflow-hidden"
          style={{ width: "33.333%", flexShrink: 0, background: `radial-gradient(ellipse at center, ${starColor}12 0%, transparent 70%)` }}
        >
          <div
            className="pointer-events-none absolute rounded-full"
            style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 288, height: 288, filter: "blur(100px)", opacity: 0.25, backgroundColor: starColor }}
          />
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                width: 4, height: 4,
                backgroundColor: starColor,
                opacity: 0.2 + (i % 4) * 0.1,
                top: `${10 + i * 11}%`,
                left: `${8 + ((i * 31) % 84)}%`,
                animationDelay: `${i * 0.35}s`,
              }}
            />
          ))}
          {/* 별 SVG */}
          <div className="relative flex items-center justify-center" style={{ marginBottom: 32 }}>
            <div style={{ position: "relative", zIndex: 10 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <defs>
                  <radialGradient id="dsg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={starColor} stopOpacity="1" />
                    <stop offset="70%" stopColor={starColor} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={starColor} stopOpacity="0.2" />
                  </radialGradient>
                  <filter id="dsgl">
                    <feGaussianBlur stdDeviation="6" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <polygon points="60,5 72,42 110,42 80,65 90,102 60,80 30,102 40,65 10,42 48,42" fill="url(#dsg)" filter="url(#dsgl)" />
              </svg>
            </div>
            <div
              className="absolute rounded-[100%]"
              style={{ width: 192, height: 56, border: `2px solid ${starColor}33`, transform: "rotate(-18deg)" }}
            />
          </div>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.35em", color: "#64748b", marginBottom: 4 }}>
            {selectedDeepStar.deepType || "HTP"} Deep Star
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>심층 분석</p>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
            {(() => {
              const d = new Date(selectedDeepStar.createdAt);
              if (isNaN(d.getTime())) return "날짜 정보 없음";
              return formatDateTimeKST(selectedDeepStar.createdAt);
            })()}
          </p>
          {Array.isArray(selectedDeepStar.psychAssessments) && selectedDeepStar.psychAssessments.length > 0 && (
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, borderRadius: 9999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: "8px 16px" }}>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b" }}>WHO-5</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#a5b4fc" }}>{selectedDeepStar.psychAssessments[0].scoreTotal}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>/25</span>
            </div>
          )}
        </div>

        {/* ── 오른쪽: 리포트 영역 (2/3) ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 32px 20px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.35em", color: "#94a3b8" }}>Deep Report</p>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginTop: 4 }}>
                {selectedDeepStar.deepType || "HTP"} 심층 분석 리포트
              </h3>
            </div>
            <button
              onClick={() => setSelectedDeepStar(null)}
              style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9999, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", border: "none", cursor: "pointer" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 본문 */}
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
            {reportLoading && !selectedDeepStar.aiSummary ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", color: "#94a3b8" }}>
                <div className="animate-spin" style={{ width: 36, height: 36, borderRadius: 9999, border: "2px solid #6366f1", borderTopColor: "transparent", marginBottom: 16 }} />
                <p style={{ fontSize: 14 }}>심층 분석 리포트를 생성하고 있습니다...</p>
              </div>
            ) : reportError ? (
              <div style={{ padding: "64px 0", textAlign: "center" }}>
                <p style={{ color: "#fb7185", marginBottom: 16 }}>{reportError}</p>
                <button
                  onClick={() => setSelectedDeepStar(null)}
                  style={{ padding: "8px 24px", borderRadius: 9999, background: "rgba(255,255,255,0.1)", color: "white", border: "none", cursor: "pointer" }}
                >
                  닫기
                </button>
              </div>
            ) : (
              <>
                {/* HTP 제출 이미지 */}
                {Array.isArray(selectedDeepStar.submissions) && selectedDeepStar.submissions.length > 0 && (
                  <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 16 }}>제출된 그림</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                      {selectedDeepStar.submissions.map((sub: any, i: number) => (
                        <div key={i} style={{ position: "relative", overflow: "hidden", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,23,42,0.6)" }}>
                          <div style={{ position: "absolute", top: 8, left: 8, zIndex: 10, borderRadius: 6, background: "rgba(0,0,0,0.6)", padding: "2px 8px", backdropFilter: "blur(4px)" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#e2e8f0" }}>{sub.type}</span>
                          </div>
                          {sub.imageUrl ? (
                            <img
                              src={sub.imageUrl}
                              alt={sub.type}
                              style={{ aspectRatio: "1", width: "100%", objectFit: "contain", background: "rgba(255,255,255,0.05)", padding: 12 }}
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
                            <div style={{ aspectRatio: "1", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(30,41,59,0.5)", padding: 16 }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, color: "#475569" }}>
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="m21 15-5-5L5 21" />
                              </svg>
                              <span style={{ fontSize: 10, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.1em" }}>{sub.type}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI 분석 리포트 */}
                <div style={{ borderRadius: 16, border: "1px solid rgba(129,140,248,0.15)", background: "linear-gradient(to bottom right, rgba(99,102,241,0.08), transparent)", padding: 24 }}>
                  <p style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "#a5b4fc" }}>✦ AI 분석 리포트</p>
                  <p style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {selectedDeepStar.aiSummary || "심층 분석 결과가 아직 준비되지 않았습니다."}
                  </p>
                </div>

                {/* 추천 질문 */}
                {Array.isArray(selectedDeepStar.questions) && selectedDeepStar.questions.length > 0 && (
                  <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 12 }}>추천 질문</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {selectedDeepStar.questions.slice(0, 5).map((q: string, idx: number) => (
                        <li key={`${idx}-${q}`} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14, color: "#cbd5e1", lineHeight: 1.6 }}>
                          <span style={{ marginTop: 2, display: "flex", width: 24, height: 24, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 9999, background: "rgba(99,102,241,0.15)", fontSize: 10, fontWeight: 700, color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>{idx + 1}</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* WHO-5 심리검사 상세 */}
                {Array.isArray(selectedDeepStar.psychAssessments) && selectedDeepStar.psychAssessments.length > 0 && (
                  <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 12 }}>심리검사 결과</p>
                    {selectedDeepStar.psychAssessments.map((pa: any, idx: number) => {
                      const pct = Math.min(100, (pa.scoreTotal / 25) * 100);
                      const level = pct >= 72 ? "양호" : pct >= 52 ? "보통" : "주의";
                      const barBg = pct >= 72 ? "#34d399" : pct >= 52 ? "#fbbf24" : "#fb7185";
                      return (
                        <div key={idx} style={{ marginBottom: idx < selectedDeepStar.psychAssessments!.length - 1 ? 12 : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 14, color: "#cbd5e1" }}>{pa.testCode || "WHO-5"}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: barBg }}>{level} · {pa.scoreTotal}점</span>
                          </div>
                          <div style={{ height: 10, width: "100%", borderRadius: 9999, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 9999, background: barBg, width: `${pct}%`, transition: "width 0.5s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 푸터 */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "16px 32px", display: "flex", justifyContent: "flex-end", background: "rgba(2,6,23,0.5)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
            <button
              onClick={() => setSelectedDeepStar(null)}
              style={{ padding: "10px 24px", borderRadius: 12, background: "#1e293b", color: "white", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
