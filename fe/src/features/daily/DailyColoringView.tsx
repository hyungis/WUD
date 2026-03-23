import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCanvasDrawing } from "../../hooks/useCanvasDrawing";
import type { ToolType } from "../../hooks/useCanvasDrawing";
import { DailyColoringCanvas } from "./components/DailyColoringCanvas";
import { DAILY_LIMIT_MESSAGE, hasTodayDailyEntryByType } from "../../utils/dailyLimit";

/* ── constants ── */
const PALETTE = [
  "#111827", "#374151", "#6B7280", "#F97316", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
];

const COLORING_OUTLINE = "/coloring/mona_lisa.png";

/* ── tiny SVG icons ── */
const BrushIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /></svg>;
const FillIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2.5 2.5l19 19" /><path d="M12 2v6.5L17.5 14" /><path d="M19 19c1.5 0 3-1.5 3-3s-3-5-3-5-3 3-3 5 1.5 3 3 3z" /><path d="M2 22l4-4" /><path d="M7.5 13.5L2 19" /></svg>;
const EraserIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M7 21h10" /><path d="M5.5 12.5L12 6l6 6-4.5 4.5a2.12 2.12 0 01-3 0l-5-5z" /></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>;
const UndoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" /></svg>;
const RedoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" /></svg>;

/* ── toolbar pill button ── */
function ToolBtn({
  active, disabled, onClick, children, title,
}: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150 shrink-0 ${disabled
        ? "opacity-30 cursor-not-allowed text-zinc-600"
        : active
          ? "scale-105 border border-white/30 bg-white/20 text-white shadow-[0_0_18px_rgba(255,255,255,0.16)]"
          : "border border-transparent bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/12 hover:text-white"
        }`}
    >
      {children}
    </button>
  );
}

/* ── main page ── */
type DailyColoringViewProps = {
  isModal?: boolean;
  onClose?: () => void;
  onBackToContent?: () => void;
  onComplete?: () => void;
};

function DailyColoringView({ isModal = false, onClose, onBackToContent, onComplete }: DailyColoringViewProps) {
  const navigate = useNavigate();

  const [shellColor] = useState(() => localStorage.getItem("dailyMoodColor") || PALETTE[0]);
  const [paintColor, setPaintColor] = useState(PALETTE[4]); // 기본 노란색 (모나리자 느낌)
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState<ToolType>("brush");
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const drawing = useCanvasDrawing({ paintColor, brushSize, tool, symmetry: 1 });

  const canEnterColoringFromSelection = () => {
    const selectedContent = localStorage.getItem("dailySelectedContent");
    if (selectedContent === "COLORING") {
      localStorage.removeItem("dailySelectedContent");
      return true;
    }

    const pendingRaw = localStorage.getItem("pendingDailyRecord");
    if (!pendingRaw) return false;

    try {
      const pending = JSON.parse(pendingRaw) as { dailyType?: string };
      return pending.dailyType === "COLORING";
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!isModal && !canEnterColoringFromSelection()) {
      navigate("/daily/content", { replace: true });
      return;
    }

    let alive = true;

    const guardByDailyLimit = async () => {
      try {
        const existsToday = await hasTodayDailyEntryByType("COLORING");
        if (!alive || !existsToday) return;

        window.alert(DAILY_LIMIT_MESSAGE);
        if (onClose) {
          onClose();
          return;
        }
        navigate("/", { replace: true });
      } catch {
        // 조회 실패 시에는 상세 화면 사용을 허용
      }
    };

    void guardByDailyLimit();
    return () => {
      alive = false;
    };
  }, [isModal, navigate, onClose]);

  const handleClose = () => {
    if (onClose) { onClose(); return; }
    if (window.history.length > 1) { navigate(-1); return; }
    navigate("/");
  };

  const handleBackToContent = () => {
    if (onBackToContent) { onBackToContent(); return; }
    navigate("/daily/content");
  };

  const handleOpenComplete = () => {
    if (onComplete) { onComplete(); return; }
    navigate("/daily/complete");
  };

  const togglePopup = (name: string) => setActivePopup(prev => prev === name ? null : name);

  const exportAndComplete = () => {
    const originalCanvas = drawing.canvasRef.current;
    let drawingImage = null;
    if (originalCanvas) {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 1024;
      exportCanvas.height = 1024;
      const exportCtx = exportCanvas.getContext("2d");
      if (exportCtx) {
        exportCtx.fillStyle = "#ffffff";
        exportCtx.fillRect(0, 0, 1024, 1024);
        exportCtx.drawImage(originalCanvas, 0, 0, 1024, 1024);
        drawingImage = exportCanvas.toDataURL("image/jpeg", 0.6);
      }
    }
    const createdAt = new Date().toISOString();
    localStorage.removeItem("dailyDrawingImageId");
    localStorage.setItem("pendingDailyRecord", JSON.stringify({
      shellColor, coreColor: paintColor, objectType: "halo", objectColor: paintColor,
      mandalaImage: drawingImage, dailyType: "COLORING", createdAt,
    }));
    localStorage.setItem("dailyMoodColor", shellColor);
    handleOpenComplete();
  };

  const content = (
    <div
      className={`relative flex w-full flex-col overflow-hidden bg-zinc-950 text-zinc-100 ${isModal ? "h-full" : "h-[100dvh]"}`}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.toolbar-area, .toolbar-popup')) return;
        setActivePopup(null);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />

      {/* ─── 헤더 ─── */}
      <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={handleBackToContent}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">명화 색칠하기</span>
        </div>
        <div className="flex items-center gap-2">
          {isModal && (
            <button type="button" onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition text-xs">✕</button>
          )}
          <button type="button" onClick={exportAndComplete}
            className="h-8 rounded-xl border border-white/20 bg-white/15 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/25">
            완료
          </button>
        </div>
      </header>

      {/* ─── 메인: 좌 툴바 + 중앙 캔버스 ─── */}
      <div className="flex flex-1 min-h-0 relative z-10">

        {/* ─── 좌측 세로 툴바 ─── */}
        <div className="toolbar-area z-40 shrink-0 flex w-20 flex-col items-center gap-1.5 overflow-visible border-r border-white/10 bg-zinc-900/95 py-3 backdrop-blur-md">

          {/* 도구 */}
          <ToolBtn active={tool === "brush"} onClick={() => { setTool("brush"); setActivePopup(null); }} title="브러시"><BrushIcon /></ToolBtn>
          <ToolBtn active={tool === "fill"} onClick={() => { setTool("fill"); setActivePopup(null); }} title="채우기"><FillIcon /></ToolBtn>
          <ToolBtn active={tool === "eraser"} onClick={() => { setTool("eraser"); setActivePopup(null); }} title="지우개"><EraserIcon /></ToolBtn>

          <div className="w-10 h-px bg-white/10 my-1.5" />

          {/* 색상 */}
          <div className="relative">
            <ToolBtn active={activePopup === "color"} onClick={() => togglePopup("color")} title="색상">
              <div className="h-5 w-5 rounded-full ring-2 ring-white/40" style={{ backgroundColor: paintColor }} />
            </ToolBtn>
            {activePopup === "color" && (
              <div className="toolbar-popup absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 w-[280px] bg-zinc-950 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-xl z-50"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-zinc-950 border-l border-b border-white/15" />
                <div className="grid grid-cols-6 gap-2.5 mb-3">
                  {PALETTE.map((c) => (
                    <button key={c} onClick={() => setPaintColor(c)}
                      className={`h-9 w-9 rounded-full transition-all ${paintColor === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : "hover:scale-110 opacity-80 hover:opacity-100"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <label className="flex h-8 w-full cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-zinc-900/95 text-xs text-zinc-300 transition-colors hover:bg-zinc-800">
                  커스텀 색상
                  <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                </label>
              </div>
            )}
          </div>

          {/* 굵기 */}
          <div className="relative">
            <ToolBtn active={activePopup === "size"} onClick={() => togglePopup("size")} title="굵기">
              <span className="inline-block rounded-full bg-current" style={{ width: Math.max(4, Math.min(brushSize + 2, 12)), height: Math.max(4, Math.min(brushSize + 2, 12)) }} />
            </ToolBtn>
            {activePopup === "size" && (
              <div className="toolbar-popup absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 w-56 bg-zinc-950 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-xl z-50"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-zinc-950 border-l border-b border-white/15" />
                <div className="flex justify-between items-center mb-2.5 text-xs text-zinc-400">
                  <span>굵기</span><span className="text-zinc-300 font-bold">{brushSize}px</span>
                </div>
                <input type="range" min="1" max="30" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-zinc-400" />
              </div>
            )}
          </div>

          <div className="w-10 h-px bg-white/10 my-1.5" />

          {/* 실행취소 / 다시실행 / 전체삭제 */}
          <ToolBtn disabled={!drawing.canUndo} onClick={drawing.handleUndo} title="실행취소"><UndoIcon /></ToolBtn>
          <ToolBtn disabled={!drawing.canRedo} onClick={drawing.handleRedo} title="다시실행"><RedoIcon /></ToolBtn>
          <ToolBtn onClick={() => { drawing.handleClearCanvas(); setActivePopup(null); }} title="전체 지우기"><TrashIcon /></ToolBtn>
        </div>

        {/* ─── 캔버스 영역 ─── */}
        <div
          className="flex-1 flex flex-col items-center justify-start min-w-0 min-h-0 overflow-hidden p-3 pt-4 relative"
          onPointerDown={() => setActivePopup(null)}
        >
          {/* 가이드 메시지 */}
          <div className="z-10 bg-zinc-900/72 backdrop-blur-md border border-white/12 px-5 py-2.5 rounded-full shadow-xl pointer-events-none text-center shrink-0">
            <p className="text-sm text-zinc-200">모나리자에 자유롭게 색을 칠해보세요 🎨</p>
          </div>

          {/* 캔버스 래퍼 */}
          <div
            className="relative h-[min(88vw,calc(100dvh-180px))] w-[min(88vw,calc(100dvh-180px))] max-h-[760px] max-w-[760px] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_16px_64px_rgba(0,0,0,0.5)] bg-white shrink-0 mt-2 mx-auto"
          >
            <DailyColoringCanvas drawing={drawing} tool={tool} outlineUrl={COLORING_OUTLINE} />
          </div>
        </div>

      </div>
    </div>
  );

  if (!isModal) return content;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default pointer-events-auto"
      />
      <div
        className="pointer-events-auto relative z-10 h-full w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl animate-in zoom-in-95 duration-300"
      >
        {content}
      </div>
    </div>
  );
}

export default DailyColoringView;
