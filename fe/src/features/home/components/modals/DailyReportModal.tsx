import type { DailyPlanet } from "../../utils/homeHelpers";
import { formatDateTimeKST } from "../../utils/homeHelpers";

const COLOR_TO_EMOTION: Record<string, string> = {
  "#FFD54F": "기쁨", "#4FC3F7": "평온", "#FF6FAE": "설렘", "#66BB6A": "만족",
  "#5C6BC0": "슬픔", "#9575CD": "불안", "#EF5350": "분노", "#90A4AE": "지침",
};
const emotionFromColor = (hex: string) => COLOR_TO_EMOTION[hex.toUpperCase()] || hex;

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

  const resolveDailyFallbackMessage = (status?: string) => {
    if (status === "FAILED") return "데일리 AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.";
    if (status === "PENDING" || status === "ANALYZING") return "데일리 AI 분석이 진행 중입니다. 잠시 후 다시 확인해주세요.";
    return "데일리 AI 분석 결과가 아직 준비되지 않았습니다.";
  };

  const dailySummary =
    (planet as any).aiSummary || resolveDailyFallbackMessage((planet as any).analysisStatus);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative mx-4 flex w-full flex-row overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
        style={{ maxWidth: "1600px", width: "88vw", height: "92vh", maxHeight: "96vh" }}
      >
        {/* ── 왼쪽: 별 시각화 영역 (1/3) ── */}
        <div
          className="relative flex flex-col items-center justify-center border-r border-white/10 overflow-hidden"
          style={{ width: "25%", flexShrink: 0, background: `radial-gradient(ellipse at center, ${planet.shell}12 0%, transparent 70%)` }}
        >
          <div
            className="pointer-events-none absolute rounded-full"
            style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 288, height: 288, filter: "blur(100px)", opacity: 0.3, backgroundColor: planet.shell }}
          />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                width: 4, height: 4,
                backgroundColor: planet.shell,
                opacity: 0.3 + (i % 3) * 0.15,
                top: `${15 + i * 14}%`,
                left: `${10 + ((i * 37) % 80)}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
          <div className="relative flex items-center justify-center" style={{ marginBottom: 32 }}>
            <div
              className="relative rounded-md"
              style={{
                zIndex: 10, width: 112, height: 112, transform: "rotate(45deg)",
                background: `linear-gradient(135deg, ${planet.shell}ff, ${planet.core || planet.shell}88, ${planet.shell}33)`,
                boxShadow: `0 0 60px ${planet.shell}55, 0 0 120px ${planet.shell}22`,
              }}
            />
            <div
              className="absolute rounded-[100%]"
              style={{ width: 208, height: 64, border: `3px solid ${planet.shell}44`, transform: "rotate(-15deg)" }}
            />
            <div
              className="absolute rounded-[100%]"
              style={{ width: 208, height: 64, borderTop: "3px solid transparent", borderBottom: `3px solid ${planet.shell}99`, borderLeft: "3px solid transparent", borderRight: "3px solid transparent", transform: "rotate(-15deg)", zIndex: 20 }}
            />
          </div>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.35em", color: "#64748b", marginBottom: 4 }}>Daily Planet</p>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", textAlign: "center", padding: "0 24px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
            {planet.memo?.slice(0, 24) || "데일리 행성"}
          </h3>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>{formatDateTimeKST(planet.createdAt)}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 9999, background: "rgba(255,255,255,0.05)", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 12, height: 12, borderRadius: 9999, backgroundColor: planet.shell }} />
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{emotionFromColor(planet.shell)}</span>
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 리포트 영역 (2/3) ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 32px 20px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.35em", color: "#94a3b8" }}>Daily Report</p>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginTop: 4 }}>감정 분석 리포트</h3>
            </div>
            <button
              onClick={onClose}
              style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9999, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", border: "none", cursor: "pointer" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 본문 */}
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
            {reportLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", color: "#94a3b8" }}>
                <div className="animate-spin" style={{ width: 36, height: 36, borderRadius: 9999, border: "2px solid #6366f1", borderTopColor: "transparent", marginBottom: 16 }} />
                <p style={{ fontSize: 14 }}>리포트 불러오는 중...</p>
              </div>
            )}
            {reportError && (
              <div style={{ borderRadius: 16, border: "1px solid rgba(252,165,165,0.3)", background: "rgba(252,165,165,0.1)", padding: 16, fontSize: 12, color: "#ffe4e6" }}>
                {reportError}
              </div>
            )}
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(to bottom right, rgba(255,255,255,0.05), rgba(255,255,255,0.02))", padding: 24 }}>
              <p style={{ marginBottom: 12, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.35em", color: "#94a3b8" }}>✦ 오늘의 감정 인사이트</p>
              <p style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{dailySummary}</p>
            </div>
            {planet.memo && (
              <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", padding: 20 }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 8 }}>오늘의 기록</p>
                <p style={{ fontSize: 16, color: "#e2e8f0", lineHeight: 1.6, fontStyle: "italic" }}>"{planet.memo}"</p>
              </div>
            )}
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", padding: 20 }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 12 }}>감정 정보</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)", padding: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, backgroundColor: planet.shell }} />
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", color: "#64748b" }}>내가 고른 감정</p>
                  <p style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{emotionFromColor(planet.shell)}</p>
                </div>
              </div>
            </div>
            {planet.objectType && (
              <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", padding: 16 }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 8 }}>오브젝트 타입</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 9999, background: "rgba(56,189,248,0.15)", color: "#7dd3fc", border: "1px solid rgba(56,189,248,0.2)" }}>{planet.objectType}</span>
                  {planet.objectColor && <div style={{ width: 20, height: 20, borderRadius: 9999, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: planet.objectColor }} />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
