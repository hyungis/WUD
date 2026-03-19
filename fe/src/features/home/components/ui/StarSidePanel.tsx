import type { DailyPlanet, DeepStar } from "../../utils/homeHelpers";
import { formatDateTimeKST } from "../../utils/homeHelpers";

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

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 배경은 보이되, 바깥 클릭으로 닫기 위한 투명 레이어 */}
      <button
        type="button"
        aria-label="close report"
        className="absolute inset-0 pointer-events-auto bg-transparent"
        onClick={onClose}
      />

      {/* 오른쪽 플로팅 모달 */}
      <div
        className="pointer-events-auto absolute right-4 top-1/2 flex h-[84vh] max-h-[92vh] w-[min(46vw,760px)] min-w-[420px] -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/88 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:right-6"
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.3em", color: "#94a3b8", fontWeight: 600 }}>
              {isDeep ? `${selectedDeepStar?.deepType ?? "HTP"} Deep Report` : "Daily Report"}
            </p>
            <button
              onClick={onClose}
              style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
        </div>

        {/* 바디 */}
        <div
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.24) transparent",
          }}
        >

            {/* 로딩 */}
          {reportLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", color: "#94a3b8" }}>
                <div className="mb-3 h-9 w-9 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent" />
                <p style={{ fontSize: 13 }}>리포트 불러오는 중...</p>
              </div>
            )}

            {/* 에러 */}
          {reportError && !reportLoading && (
              <div style={{ borderRadius: 12, border: "1px solid rgba(251,113,133,0.3)", background: "rgba(251,113,133,0.08)", padding: 16, fontSize: 13, color: "#fda4af" }}>
                {reportError}
              </div>
            )}

            {/* ── DEEP STAR 리포트 ── */}
          {isDeep && !reportLoading && !reportError && (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{selectedDeepStar?.deepType ?? "HTP"} 심층 분석</p>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                      {selectedDeepStar?.createdAt ? formatDateTimeKST(selectedDeepStar.createdAt) : ""}
                    </p>
                  </div>
                  {Array.isArray(selectedDeepStar?.psychAssessments) && selectedDeepStar!.psychAssessments!.length > 0 && (
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b" }}>WHO-5</p>
                      <p style={{ fontSize: 28, fontWeight: 700, color: "#a5b4fc" }}>
                        {selectedDeepStar!.psychAssessments![0].scoreTotal}
                        <span style={{ fontSize: 14, color: "#64748b" }}>/25</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* HTP 제출 이미지 */}
                {Array.isArray(selectedDeepStar?.submissions) && selectedDeepStar!.submissions!.length > 0 && (
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", padding: 20 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 14 }}>제출된 그림</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      {selectedDeepStar!.submissions!.map((sub: any, i: number) => (
                        <div key={i} style={{ position: "relative", overflow: "hidden", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(15,23,42,0.6)" }}>
                          <div style={{ position: "absolute", top: 6, left: 6, zIndex: 10, borderRadius: 4, background: "rgba(0,0,0,0.6)", padding: "2px 6px" }}>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#e2e8f0" }}>{sub.type}</span>
                          </div>
                          {sub.imageUrl ? (
                            <img src={sub.imageUrl} alt={sub.type} style={{ width: "100%", aspectRatio: "1", objectFit: "contain", background: "rgba(255,255,255,0.03)", padding: 4 }} />
                          ) : (
                            <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,41,59,0.5)" }}>
                              <span style={{ fontSize: 10, color: "#64748b" }}>{sub.type}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI 분석 */}
                <div style={{ borderRadius: 14, border: "1px solid rgba(99,102,241,0.15)", background: "linear-gradient(135deg, rgba(99,102,241,0.08), transparent)", padding: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#a5b4fc", marginBottom: 10 }}>AI 분석 리포트</p>
                  <p style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                    {selectedDeepStar?.aiSummary || "심층 분석 결과가 아직 준비되지 않았습니다."}
                  </p>
                </div>

                {/* WHO-5 상세 */}
                {Array.isArray(selectedDeepStar?.psychAssessments) && selectedDeepStar!.psychAssessments!.length > 0 && (
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", padding: 20 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 14 }}>심리검사 결과</p>
                    {selectedDeepStar!.psychAssessments!.map((pa: any, idx: number) => {
                      const pct = Math.min(100, (pa.scoreTotal / 25) * 100);
                      const level = pct >= 72 ? "양호" : pct >= 52 ? "보통" : "주의";
                      const barColor = pct >= 72 ? "#34d399" : pct >= 52 ? "#fbbf24" : "#fb7185";
                      return (
                        <div key={idx} style={{ marginBottom: idx < selectedDeepStar!.psychAssessments!.length - 1 ? 10 : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: "#cbd5e1" }}>{pa.testCode ?? "WHO-5"}</span>
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>{level} · {pa.scoreTotal}점</span>
                          </div>
                          <div style={{ height: 6, width: "100%", borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 999, background: barColor, width: `${pct}%`, transition: "width 0.5s ease" }} />
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
                {/* 기록 일시 */}
                <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: 16 }}>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 4 }}>기록 일시</p>
                  <p style={{ fontSize: 14, color: "#e2e8f0" }}>{formatDateTimeKST(selectedDailyPlanet.createdAt)}</p>
                </div>

                {/* AI 분석 */}
                <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))", padding: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 10 }}>✦ 오늘의 감정 인사이트</p>
                  <p style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                    {(selectedDailyPlanet as any).aiSummary
                      || resolveDailyFallbackMessage((selectedDailyPlanet as any).analysisStatus)}
                  </p>
                </div>

                {/* 색상 정보 */}
                <div style={{ display: "grid", gridTemplateColumns: selectedDailyPlanet.core ? "1fr 1fr" : "1fr", gap: 12 }}>
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: 16 }}>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 8 }}>내가 고른 감정</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, backgroundColor: selectedDailyPlanet.shell }} />
                      <span style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "monospace" }}>{selectedDailyPlanet.shell}</span>
                    </div>
                  </div>
                  {selectedDailyPlanet.core && (
                    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: 16 }}>
                      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 8 }}>분석된 감정</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, backgroundColor: selectedDailyPlanet.core }} />
                        <span style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "monospace" }}>{selectedDailyPlanet.core}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 메모 */}
                {selectedDailyPlanet.memo && (
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: 20 }}>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 8 }}>오늘의 기록</p>
                    <p style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.6 }}>"{selectedDailyPlanet.memo}"</p>
                  </div>
                )}

                {/* 오브젝트 타입 */}
                {selectedDailyPlanet.objectType && (
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", padding: 16 }}>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8", marginBottom: 8 }}>오브젝트 타입</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(56,189,248,0.12)", color: "#7dd3fc" }}>
                        {selectedDailyPlanet.objectType}
                      </span>
                      {selectedDailyPlanet.objectColor && (
                        <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: selectedDailyPlanet.objectColor }} />
                      )}
                    </div>
                  </div>
                )}
              </>
          )}
        </div>
      </div>
    </div>
  );
}
