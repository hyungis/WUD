import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCanvasDrawing } from "../../hooks/useCanvasDrawing";
import type { ToolType } from "../../hooks/useCanvasDrawing";
import { DrawingCanvas } from "../../components/shared/DrawingCanvas";
import { useAlert } from "../../components/shared/AlertProvider";
import { useConfirm } from "../../components/shared/ConfirmProvider";
import { DAILY_LIMIT_MESSAGE, hasTodayDailyEntryByType } from "../../utils/dailyLimit";
import { DEFAULT_PAINT_COLOR, PAINT_PRESET_COLORS, addRecentPaintColor, getRecentPaintColors, pushRecentPaintColor, saveRecentPaintColors } from "../../utils/paintColors";
import { useUiStore } from "../../store/uiStore";
import { getToolCursor } from "../../utils/toolCursors";

/* ── constants ── */
const PALETTE = [
  "#111827", "#374151", "#6B7280", "#F97316", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
];

/* ── tiny SVG icons (Lucide-based) ── */
const BrushIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>;
const FillIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path d="m5 2 5 5" /><path d="M2 13h15" /><path d="M22 20c0 .8-.7 1.7-1.5 1.7S19 20.8 19 20s1.5-2.8 1.5-2.8S22 19.2 22 20Z" /></svg>;
const EraserIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></svg>;
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
export default function DailyFreeDrawView({ isModal = false, onClose, onBackToContent, onComplete }: { isModal?: boolean; onClose?: () => void; onBackToContent?: () => void; onComplete?: () => void }) {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();

  const isDailyFreeDrawReturning = useUiStore((state) => state.isDailyFreeDrawReturning);
  const setDailyFreeDrawReturning = useUiStore((state) => state.setDailyFreeDrawReturning);
  const {
    setDailyCompleteModalOpen,
    setDailyFreeDrawModalOpen,
  } = useUiStore();

  const [shellColor] = useState(() => localStorage.getItem("dailyMoodColor") || PALETTE[0]);
  const [paintColor, setPaintColor] = useState<string>(DEFAULT_PAINT_COLOR);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState<ToolType>("brush");
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const drawing = useCanvasDrawing({ paintColor, brushSize, tool, symmetry: 1 });
  const cursor = getToolCursor(tool, paintColor, 18 + brushSize * 2);

  useEffect(() => {
    const stored = getRecentPaintColors();
    if (stored.length > 0) {
      setRecentColors(stored);
      return;
    }
    const seeded = addRecentPaintColor(paintColor, []);
    saveRecentPaintColors(seeded);
    setRecentColors(seeded);
  }, []);

  const selectPaintColor = (color: string) => {
    setPaintColor(color);
    const nextRecent = pushRecentPaintColor(color);
    setRecentColors(nextRecent);
  };

  const customColorStartRef = useRef<string>(DEFAULT_PAINT_COLOR);
  const customColorDraftRef = useRef<string>(DEFAULT_PAINT_COLOR);
  const customColorCommitTimerRef = useRef<number | null>(null);

  const handleCustomColorFocus = () => {
    customColorStartRef.current = paintColor;
    customColorDraftRef.current = paintColor;
  };

  const commitCustomColorIfNeeded = () => {
    const nextColor = customColorDraftRef.current;
    if (nextColor.toUpperCase() === customColorStartRef.current.toUpperCase()) {
      return;
    }
    selectPaintColor(nextColor);
    customColorDraftRef.current = nextColor;
    customColorStartRef.current = nextColor;
  };

  const flushCustomColorCommit = () => {
    if (customColorCommitTimerRef.current !== null) {
      window.clearTimeout(customColorCommitTimerRef.current);
      customColorCommitTimerRef.current = null;
    }
    commitCustomColorIfNeeded();
  };

  const handleCustomColorInput = (nextColor: string) => {
    if (customColorCommitTimerRef.current !== null) {
      window.clearTimeout(customColorCommitTimerRef.current);
    }
    customColorDraftRef.current = nextColor;
    setPaintColor(nextColor);
    customColorCommitTimerRef.current = window.setTimeout(() => {
      customColorCommitTimerRef.current = null;
      commitCustomColorIfNeeded();
    }, 400);
  };

  const handleCustomColorBlur = () => {
    flushCustomColorCommit();
  };

  const closeActivePopup = () => {
    if (activePopup === "color") {
      flushCustomColorCommit();
    }
    setActivePopup(null);
  };

  useEffect(() => {
    return () => {
      if (customColorCommitTimerRef.current !== null) {
        window.clearTimeout(customColorCommitTimerRef.current);
      }
    };
  }, []);

  const canEnterFromSelection = () => {
    const selectedContent = localStorage.getItem("dailySelectedContent");
    if (selectedContent === "FREE_DRAW") {
      localStorage.removeItem("dailySelectedContent");
      return true;
    }

    const pendingRaw = localStorage.getItem("pendingDailyRecord");
    if (!pendingRaw) return false;

    try {
      const pending = JSON.parse(pendingRaw) as { dailyType?: string };
      return pending.dailyType === "FREE_DRAW";
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!isModal && !canEnterFromSelection()) {
      navigate("/daily/content", { replace: true });
      return;
    }

    let alive = true;

    const guardByDailyLimit = async () => {
      try {
        const existsToday = await hasTodayDailyEntryByType("COLORING");
        if (!alive || !existsToday) return;

        showAlert(DAILY_LIMIT_MESSAGE, "error");
        if (onClose) {
          onClose();
          return;
        }
        navigate("/", { replace: true });
      } catch {
      }
    };

    void guardByDailyLimit();
    return () => {
      alive = false;
      setDailyFreeDrawReturning(false);
    };
  }, [isModal, navigate, onClose, setDailyFreeDrawReturning, showAlert]);

  // ─── 기존 작업 내역 복원 (드로잉 데이터) ───
  useEffect(() => {
    if (!isDailyFreeDrawReturning) {
      // 신규 진입 시 캔버스 배경 설정 (흰색)
      const canvas = drawing.canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
          drawing.saveHistory();
        }
      }
      return;
    }
    
    const canvas = drawing.canvasRef.current;
    if (!canvas) return;

    const pendingRaw = localStorage.getItem("pendingDailyRecord");
    if (!pendingRaw) return;

    try {
      const pending = JSON.parse(pendingRaw);
      if (pending.dailyType === "FREE_DRAW" && pending.mandalaImage) {
        const img = new Image();
        img.src = pending.mandalaImage;
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();
            drawing.saveHistory();
          }
        };
      }
    } catch (e) {
      console.error("복원 실패:", e);
    }
  }, [isDailyFreeDrawReturning, drawing.canvasRef.current]);

  const handleClose = async () => {
    const confirmed = await showConfirm({
      title: "그리기 중단",
      message: "현재 작업 중인 내용이 사라집니다. 정말로 나가시겠습니까?",
      confirmText: "나가기",
      cancelText: "계속하기",
      type: "danger",
    });
    if (!confirmed) return;

    if (onClose) { onClose(); return; }
    if (window.history.length > 1) { navigate(-1); return; }
    navigate("/");
  };

  const handleBackToContent = async () => {
    const confirmed = await showConfirm({
      title: "그리기 중단",
      message: "현재 작업 중인 내용이 사라집니다. 정말로 돌아가시겠습니까?",
      confirmText: "돌아가기",
      cancelText: "계속하기",
      type: "danger",
    });
    if (!confirmed) return;

    if (onBackToContent) { onBackToContent(); return; }
    navigate("/daily/content");
  };

  const togglePopup = (name: string) => {
    if (activePopup === "color") {
      commitCustomColorIfNeeded();
    }
    setActivePopup(prev => prev === name ? null : name);
  };

  const exportAndComplete = () => {
    const originalCanvas = drawing.canvasRef.current;
    let drawingImage = null;

    if (originalCanvas) {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 768;
      exportCanvas.height = 768;
      const exportCtx = exportCanvas.getContext("2d");

      if (exportCtx) {
        // 이미 배경이 하얀색이므로 그냥 그린다
        exportCtx.fillStyle = "#ffffff";
        exportCtx.fillRect(0, 0, 768, 768);
        exportCtx.drawImage(originalCanvas, 0, 0, 768, 768);
        drawingImage = exportCanvas.toDataURL("image/jpeg", 0.6);
      }
    }

    const createdAt = new Date().toISOString();
    localStorage.removeItem("dailyDrawingImageId");
    localStorage.setItem("pendingDailyRecord", JSON.stringify({
      shellColor, coreColor: paintColor, objectType: "spark", objectColor: paintColor,
      mandalaImage: drawingImage, dailyType: "FREE_DRAW", createdAt,
    }));
    localStorage.setItem("dailyMoodColor", shellColor);
    
    if (onComplete) { onComplete(); return; }
    if (isModal) {
      setDailyFreeDrawModalOpen(false);
      setDailyCompleteModalOpen(true);
    } else {
      navigate("/daily/complete");
    }
  };

  const handleClearCanvasWithBg = () => {
    drawing.handleClearCanvas();
    const canvas = drawing.canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        setTimeout(() => drawing.saveHistory(), 50);
      }
    }
  };

  const content = (
    <div
      className={`relative flex w-full flex-col overflow-hidden bg-zinc-950 text-zinc-100 ${isModal ? "h-full" : "h-[100dvh]"}`}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.toolbar-area, .toolbar-popup')) return;
        closeActivePopup();
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />

      {/* ─── 헤더 ─── */}
      <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => void handleBackToContent()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">자율 드로잉</span>
        </div>
        <div className="flex items-center gap-2">
          {isModal && (
            <button type="button" onClick={() => void handleClose()}
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
          <ToolBtn active={tool === "brush"} onClick={() => { setTool("brush"); closeActivePopup(); }} title="그리기">
            <span className="flex flex-col items-center leading-none"><BrushIcon /><span className="mt-0.5 text-[9px] font-semibold">그리기</span></span>
          </ToolBtn>
          <ToolBtn active={tool === "fill"} onClick={() => { setTool("fill"); closeActivePopup(); }} title="채우기">
            <span className="flex flex-col items-center leading-none"><FillIcon /><span className="mt-0.5 text-[9px] font-semibold">채우기</span></span>
          </ToolBtn>
          <ToolBtn active={tool === "eraser"} onClick={() => { setTool("eraser"); closeActivePopup(); }} title="지우기">
            <span className="flex flex-col items-center leading-none"><EraserIcon /><span className="mt-0.5 text-[9px] font-semibold">지우기</span></span>
          </ToolBtn>

          <div className="w-10 h-px bg-white/10 my-1.5" />

          {/* 색상 */}
          <div className="relative">
            <ToolBtn active={activePopup === "color"} onClick={() => togglePopup("color")} title="색상">
              <span className="flex flex-col items-center leading-none">
                <div className="h-5 w-5 rounded-full ring-2 ring-white/40" style={{ backgroundColor: paintColor }} />
                <span className="mt-0.5 text-[9px] font-semibold">색상</span>
              </span>
            </ToolBtn>
            {activePopup === "color" && (
              <div className="toolbar-popup absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 w-[280px] bg-zinc-950 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-xl z-50"
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-zinc-950 border-l border-b border-white/15" />
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-zinc-400">기본 색상</p>
                <div className="grid grid-cols-6 gap-3 mb-3">
                  {PAINT_PRESET_COLORS.map((c) => (
                    <button key={c} onClick={() => selectPaintColor(c)}
                      className={`h-9 w-9 rounded-full border border-white/20 transition-opacity ${paintColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 opacity-100" : "opacity-85 hover:opacity-100"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-zinc-400">최근 사용 색상</p>
                <div className="grid grid-cols-6 gap-3 min-h-9 mb-3">
                  {recentColors.length > 0 ? recentColors.map((c) => (
                    <button key={`recent-${c}`} onClick={() => selectPaintColor(c)}
                      className={`h-9 w-9 rounded-full border border-white/20 transition-opacity ${paintColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 opacity-100" : "opacity-85 hover:opacity-100"}`}
                      style={{ backgroundColor: c }} />
                  )) : <span className="col-span-6 text-[10px] text-zinc-500">아직 사용한 색상이 없습니다.</span>}
                </div>
                <label className="relative flex h-8 w-full cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-zinc-900/95 text-xs text-zinc-300 transition-colors hover:bg-zinc-800">
                  커스텀 색상
                  <input
                    type="color"
                    value={paintColor}
                    onFocus={handleCustomColorFocus}
                    onInput={(e) => handleCustomColorInput((e.target as HTMLInputElement).value)}
                    onBlur={handleCustomColorBlur}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            )}
          </div>

          {/* 굵기 */}
          <div className="relative">
            <ToolBtn active={activePopup === "size"} onClick={() => togglePopup("size")} title="굵기">
              <span className="flex flex-col items-center leading-none">
                <span className="inline-block rounded-full bg-current" style={{ width: Math.max(4, Math.min(brushSize + 2, 12)), height: Math.max(4, Math.min(brushSize + 2, 12)) }} />
                <span className="mt-0.5 text-[9px] font-semibold">굵기</span>
              </span>
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
          <ToolBtn disabled={!drawing.canUndo} onClick={drawing.handleUndo} title="실행취소">
            <span className="flex flex-col items-center leading-none"><UndoIcon /><span className="mt-0.5 text-[9px] font-semibold">되돌리기</span></span>
          </ToolBtn>
          <ToolBtn disabled={!drawing.canRedo} onClick={drawing.handleRedo} title="다시실행">
            <span className="flex flex-col items-center leading-none"><RedoIcon /><span className="mt-0.5 text-[9px] font-semibold">다시실행</span></span>
          </ToolBtn>

          <ToolBtn onClick={() => { handleClearCanvasWithBg(); closeActivePopup(); }} title="전체 지우기">
            <span className="flex flex-col items-center leading-none"><TrashIcon /><span className="mt-0.5 text-[9px] font-semibold">초기화</span></span>
          </ToolBtn>
        </div>

        {/* ─── 캔버스 영역 ─── */}
        <div
          className="flex-1 flex flex-col items-center justify-start min-w-0 min-h-0 overflow-hidden p-3 pt-4 relative"
          onPointerDown={() => closeActivePopup()}
        >
          {/* 가이드 메시지 */}
          <div className="z-10 bg-zinc-900/72 backdrop-blur-md border border-white/12 px-5 py-2.5 rounded-full shadow-xl pointer-events-none text-center shrink-0">
            <p className="text-sm text-zinc-200">마음 가는 대로 감정을 자유롭게 그려보세요 🎨</p>
          </div>

          {/* 캔버스 래퍼 (정방형) */}
          <div
            className="group relative h-[min(88vw,calc(100dvh-180px))] w-[min(88vw,calc(100dvh-180px))] max-h-[760px] max-w-[760px] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_16px_64px_rgba(0,0,0,0.5)] bg-white shrink-0 mt-2 mx-auto"
          >
            <DrawingCanvas
              canvasRef={drawing.canvasRef}
              onPointerDown={drawing.handlePointerDown}
              onPointerMove={drawing.handlePointerMove}
              onPointerUp={drawing.handlePointerUp}
              onPointerCancel={drawing.handlePointerCancel}
              cursor={cursor}
            />
          </div>
        </div>

      </div>
    </div>
  );

  if (!isModal) return content;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        type="button"
        onClick={() => void handleClose()}
        className="absolute inset-0 h-full w-full cursor-default pointer-events-auto"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="pointer-events-auto relative z-10 h-full w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl"
      >
        {content}
      </motion.div>
    </div>
  );
}
