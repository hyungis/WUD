import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";
import { useCanvasDrawing } from "./hooks/useCanvasDrawing";
import type { ToolType } from "./hooks/useCanvasDrawing";
import { DailyMandalaCanvas } from "./components/DailyMandalaCanvas";

/* ── constants ── */
const PALETTE = [
  "#111827", "#374151", "#6B7280",
  "#F97316", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1",
  "#8B5CF6", "#EC4899", "#F43F5E",
];
const SYMMETRY_OPTIONS = [4, 6, 8, 12, 16];
const BRUSH_PRESETS = [2, 4, 6, 8, 12];

/* ── tiny SVG icons ── */
const BrushIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" />
  </svg>
);
const FillIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M2.5 2.5l19 19" /><path d="M12 2v6.5L17.5 14" /><path d="M19 19c1.5 0 3-1.5 3-3s-3-5-3-5-3 3-3 5 1.5 3 3 3z" />
    <path d="M2 22l4-4" /><path d="M7.5 13.5L2 19" />
  </svg>
);
const EraserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M7 21h10" /><path d="M5.5 12.5L12 6l6 6-4.5 4.5a2.12 2.12 0 01-3 0l-5-5z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

/* ── toolbar pill button ── */
function ToolBtn({
  active, onClick, children, title,
}: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      tabIndex={-1}
      title={title}
      className={`flex items-center justify-center rounded-lg px-2.5 py-2 text-xs transition-all duration-150 ${active
        ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/50 shadow-[0_0_10px_rgba(56,189,248,0.25)]"
        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
        }`}
    >
      {children}
    </button>
  );
}

/* ── main page ── */
type DailyDetailViewProps = {
  isModal?: boolean;
  onClose?: () => void;
  onBackToContent?: () => void;
  onComplete?: () => void;
};

function DailyDetailView({ isModal = false, onClose, onBackToContent, onComplete }: DailyDetailViewProps) {
  const navigate = useNavigate();

  const [shellColor] = useState(() => localStorage.getItem("dailyMoodColor") || PALETTE[0]);
  const [paintColor, setPaintColor] = useState(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(4);
  const [symmetry, setSymmetry] = useState(8);
  const [symmetryInput, setSymmetryInput] = useState("8");
  const [tool, setTool] = useState<ToolType>("brush");

  const drawing = useCanvasDrawing({
    paintColor,
    brushSize,
    tool,
    symmetry,
  });

  /* symmetry input helpers */
  const commitSymmetry = () => {
    const v = parseInt(symmetryInput, 10);
    if (!isNaN(v) && v >= 2 && v <= 36) {
      setSymmetry(v);
      setSymmetryInput(String(v));
    } else {
      setSymmetryInput(String(symmetry));
    }
  };

  const strokeDensity = Math.min(100, Math.round((brushSize / 12) * 100));

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const handleBackToContent = () => {
    if (onBackToContent) {
      onBackToContent();
      return;
    }

    navigate("/daily/content");
  };

  const handleOpenComplete = () => {
    if (onComplete) {
      onComplete();
      return;
    }

    navigate("/daily/complete");
  };

  const content = (
    <div className="relative h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="relative mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),transparent_54%)]" />
        {/* header */}
        <header className="relative z-10 shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/75">
              Daily Detail
            </p>
            <div className="flex items-center gap-2">
              <h1 className="mt-2 text-2xl font-semibold text-slate-50 [font-family:'Manrope',sans-serif] sm:text-3xl">
                만다라 디테일
              </h1>
              <div 
                className="mt-2 h-3 w-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                style={{ backgroundColor: shellColor }}
                title="오늘의 감정 색상"
              />
            </div>
            <p className="mt-1 text-sm text-slate-300/90">오늘의 감정을 채워보세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={handleBackToContent}>
              선택으로
            </Button>
            {isModal ? (
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-slate-200 transition hover:bg-white/10"
                aria-label="닫기"
              >
                X
              </button>
            ) : (
              <Button type="button" onClick={handleClose}>메인으로</Button>
            )}
          </div>
        </header>

        {/* ─── toolbar ─── */}
        <div className="relative z-10 shrink-0 flex flex-col gap-3 rounded-2xl border border-cyan-100/15 bg-slate-900/55 px-5 py-4 shadow-[0_18px_40px_rgba(2,6,23,0.3)] backdrop-blur-md">
          {/* row 1 : tools + symmetry */}
          <div className="flex flex-wrap items-center gap-6">
            {/* 도구 */}
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-widest text-slate-500">도구</span>
              <ToolBtn active={tool === "brush"} onClick={() => setTool("brush")} title="브러시">
                <BrushIcon />
              </ToolBtn>
              <ToolBtn active={tool === "fill"} onClick={() => setTool("fill")} title="채우기">
                <FillIcon />
              </ToolBtn>
              <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="지우개">
                <EraserIcon />
              </ToolBtn>
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* 대칭선 */}
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-widest text-slate-500">대칭</span>
              {SYMMETRY_OPTIONS.map((v) => (
                <ToolBtn
                  key={v}
                  active={symmetry === v}
                  onClick={() => { setSymmetry(v); setSymmetryInput(String(v)); }}
                >
                  {v}
                </ToolBtn>
              ))}
              <input
                type="text"
                inputMode="numeric"
                value={symmetryInput}
                onChange={(e) => setSymmetryInput(e.target.value)}
                onBlur={commitSymmetry}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="w-11 rounded-lg border border-white/15 bg-slate-800/70 px-1.5 py-1.5 text-center text-xs text-slate-100 transition focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300/40"
                aria-label="대칭선 개수 직접 입력"
              />
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* 브러시 굵기 */}
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-widest text-slate-500">굵기</span>
              {BRUSH_PRESETS.map((v) => (
                <ToolBtn key={v} active={brushSize === v} onClick={() => setBrushSize(v)}>
                  <span className="flex items-center gap-1">
                    <span
                      className="inline-block rounded-full bg-current"
                      style={{ width: Math.min(v + 2, 14), height: Math.min(v + 2, 14) }}
                    />
                    <span className="text-[10px]">{v}</span>
                  </span>
                </ToolBtn>
              ))}
            </div>
          </div>

          {/* row 2 : color + actions */}
          <div className="flex flex-wrap items-center gap-6">
            {/* 색상 팔레트 */}
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-widest text-slate-500">색상</span>
              <div className="flex flex-wrap gap-1.5">
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPaintColor(color)}
                    onMouseDown={(e) => e.preventDefault()}
                    tabIndex={-1}
                    className={`h-6 w-6 rounded-full border-2 transition-all duration-150 ${paintColor === color
                      ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                      : "border-transparent hover:border-white/30 hover:scale-105"
                      }`}
                    style={{ backgroundColor: color }}
                    aria-label={`${color} 선택`}
                  />
                ))}
                <input
                  type="color"
                  value={paintColor}
                  onChange={(e) => setPaintColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded-full border-2 border-dashed border-white/20 bg-transparent hover:border-white/40 transition"
                  aria-label="직접 색상 선택"
                  title="직접 색상 선택"
                />
              </div>
            </div>

            {/* spacer */}
            <div className="ml-auto" />

            {/* 액션 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={drawing.handleClearCanvas}
                onMouseDown={(e) => e.preventDefault()}
                tabIndex={-1}
                className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400 transition hover:bg-red-500/15 hover:text-red-300"
                title="전체 지우기"
              >
                <TrashIcon />
                지우기
              </button>
              <Button
                type="button"
                onClick={() => {
                  const drawingImage = drawing.canvasRef.current?.toDataURL("image/png") ?? null;
                  const createdAt = new Date().toISOString();
                  localStorage.setItem("pendingDailyRecord", JSON.stringify({
                    shellColor,
                    coreColor: paintColor,
                    objectType: "halo",
                    objectColor: paintColor,
                    mandalaImage: drawingImage,
                    createdAt,
                  }));
                  localStorage.setItem("dailyMoodColor", shellColor);
                  handleOpenComplete();
                }}
              >
                완료하기
              </Button>
            </div>
          </div>
        </div>

        {/* ─── canvas ─── */}
        <DailyMandalaCanvas
          drawing={drawing}
          symmetry={symmetry}
          tool={tool}
        />

        <div className="relative z-10 shrink-0 rounded-2xl border border-cyan-100/15 bg-slate-900/55 px-4 py-3 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-slate-400">
            <span>Canvas Ready</span>
            <span>대칭 {symmetry} / 굵기 {brushSize}px</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-200" style={{ width: `${strokeDensity}%` }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-4 py-4 text-slate-100">
      <button
        type="button"
        aria-label="모달 닫기"
        onClick={handleClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div className="relative z-10 h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/10">
        {content}
      </div>
    </div>
  );
}

export default DailyDetailView;
