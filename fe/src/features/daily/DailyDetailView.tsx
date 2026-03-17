import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";
import { useCanvasDrawing } from "./hooks/useCanvasDrawing";
import type { ToolType } from "./hooks/useCanvasDrawing";
import { DailyMandalaCanvas } from "./components/DailyMandalaCanvas";

/* ── constants ── */
const PALETTE = [
  "#111827", "#374151", "#6B7280", "#F97316", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
];

/* ── tiny SVG icons ── */
const BrushIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /></svg>;
const FillIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2.5 2.5l19 19" /><path d="M12 2v6.5L17.5 14" /><path d="M19 19c1.5 0 3-1.5 3-3s-3-5-3-5-3 3-3 5 1.5 3 3 3z" /><path d="M2 22l4-4" /><path d="M7.5 13.5L2 19" /></svg>;
const EraserIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M7 21h10" /><path d="M5.5 12.5L12 6l6 6-4.5 4.5a2.12 2.12 0 01-3 0l-5-5z" /></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>;
const UndoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" /></svg>;
const RedoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" /></svg>;
const SymmetryIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="10" /><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /><line x1="4.93" y1="19.07" x2="19.07" y2="4.93" /></svg>;

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
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 shrink-0 ${disabled
        ? "opacity-30 cursor-not-allowed text-slate-500 bg-white/5"
        : active
          ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105"
          : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
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
  const [tool, setTool] = useState<ToolType>("brush");

  // 팝업창 관리 상태 ("color" | "size" | "symmetry" | null)
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const drawing = useCanvasDrawing({ paintColor, brushSize, tool, symmetry });

  const strokeDensity = Math.min(100, Math.round((brushSize / 20) * 100));

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

  const togglePopup = (popupName: string) => {
    setActivePopup(prev => prev === popupName ? null : popupName);
  };

  const content = (
    <div
      className="flex flex-col h-[100dvh] w-full overflow-hidden bg-slate-950 p-4 md:p-6 gap-6 text-slate-100"
      // 빈 공간 클릭 시 팝업 닫기
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.toolbar-area')) return;
        setActivePopup(null);
      }}
    >
      {/* ─── 상단 헤더 영역 ─── */}
      <header className="shrink-0 flex items-start justify-between z-10">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/75">
            Daily Detail
          </p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-50 tracking-tight sm:text-3xl">만다라 디테일</h1>
            <div className="mt-1 h-3 w-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ backgroundColor: shellColor }} />
          </div>
          <p className="text-sm text-slate-300/90">오늘의 감정을 채워보세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={handleBackToContent}>선택으로</Button>
          {isModal && (
            <button type="button" onClick={handleClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-slate-200 transition hover:bg-white/10">X</button>
          )}
          <Button
            type="button"
            onClick={() => {
              const originalCanvas = drawing.canvasRef.current;
              let drawingImage = null;

              if (originalCanvas) {
                // 1. 전송용 1024x1024 가짜(메모리) 캔버스 생성
                const exportCanvas = document.createElement("canvas");
                exportCanvas.width = 1024;
                exportCanvas.height = 1024;
                const exportCtx = exportCanvas.getContext("2d");

                if (exportCtx) {
                  // 2. 배경을 흰색으로 깔아주기 (투명 배경 방지용)
                  exportCtx.fillStyle = "#ffffff";
                  exportCtx.fillRect(0, 0, 1024, 1024);

                  // 3. 화면에 있는 그림을 1024 크기로 쫙 늘리거나 줄여서 복사해 그리기
                  exportCtx.drawImage(originalCanvas, 0, 0, 1024, 1024);

                  // 4. 복사된 1024 캔버스에서 Base64 이미지 뽑아내기
                  drawingImage = exportCanvas.toDataURL("image/png");
                }
              }

              const createdAt = new Date().toISOString();
              localStorage.setItem("pendingDailyRecord", JSON.stringify({
                shellColor,
                coreColor: paintColor,
                objectType: "halo",
                objectColor: paintColor,
                mandalaImage: drawingImage, // 여기엔 무조건 1024x1024 이미지가 들어감
                createdAt,
              }));
              localStorage.setItem("dailyMoodColor", shellColor);
              handleOpenComplete();
            }}
          >
            완료하기
          </Button>
        </div>
      </header>

      {/* ─── 메인 작업 영역 ─── */}
      <div className="flex flex-1 flex-row min-h-0 gap-6 w-full max-w-6xl mx-auto items-center justify-center relative">

        {/* ─── 1열 단일 툴바 ─── */}
        <div className="toolbar-area relative shrink-0 flex flex-col items-center h-fit gap-2 bg-slate-900/60 rounded-3xl p-3 border border-white/10 shadow-2xl backdrop-blur-md z-40">

          {/* 도구 모음 */}
          <div className="flex flex-col gap-2 border-b border-white/10 pb-3 w-full">
            <ToolBtn active={tool === "brush"} onClick={() => { setTool("brush"); setActivePopup(null); }} title="브러시"><BrushIcon /></ToolBtn>
            <ToolBtn active={tool === "fill"} onClick={() => { setTool("fill"); setActivePopup(null); }} title="채우기"><FillIcon /></ToolBtn>
            <ToolBtn active={tool === "eraser"} onClick={() => { setTool("eraser"); setActivePopup(null); }} title="지우개"><EraserIcon /></ToolBtn>
          </div>

          {/* 옵션 모음 (팝업 트리거 버튼들) */}
          <div className="flex flex-col gap-2 border-b border-white/10 py-3 w-full relative">

            {/* 1. 색상 버튼 & 팝업 */}
            <div className="relative w-full flex justify-center">
              <ToolBtn active={activePopup === "color"} onClick={() => togglePopup("color")} title="색상 선택">
                <div className="h-5 w-5 rounded-full ring-2 ring-white/50" style={{ backgroundColor: paintColor }} />
              </ToolBtn>

              {activePopup === "color" && (
                <div className="absolute left-[calc(100%+16px)] top-1/2 -translate-y-1/2 w-[210px] bg-slate-900/95 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 border-y-8 border-y-transparent border-r-8 border-r-slate-900/95" />
                  <span className="block text-xs font-bold text-slate-400 mb-3">팔레트</span>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {PALETTE.map((color) => (
                      <button
                        key={color} onClick={() => setPaintColor(color)}
                        className={`h-8 w-8 rounded-full transition-transform ${paintColor === color ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "hover:scale-110"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <label className="flex items-center justify-center w-full h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer text-xs text-slate-300 transition-colors">
                    직접 선택하기
                    <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                  </label>
                </div>
              )}
            </div>

            {/* 2. 굵기 버튼 & 팝업 */}
            <div className="relative w-full flex justify-center">
              <ToolBtn active={activePopup === "size"} onClick={() => togglePopup("size")} title="굵기 조절">
                <div className="flex flex-col items-center gap-1">
                  <span className="inline-block rounded-full bg-current" style={{ width: Math.min(brushSize + 2, 14), height: Math.min(brushSize + 2, 14) }} />
                  <span className="text-[9px] font-bold">{brushSize}</span>
                </div>
              </ToolBtn>

              {activePopup === "size" && (
                <div className="absolute left-[calc(100%+16px)] top-1/2 -translate-y-1/2 w-64 bg-slate-900/95 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 border-y-8 border-y-transparent border-r-8 border-r-slate-900/95" />
                  <div className="flex justify-between items-center mb-3 text-xs font-bold text-slate-400">
                    <span>브러시 굵기</span>
                    <span className="text-cyan-400">{brushSize}px</span>
                  </div>
                  <input
                    type="range" min="1" max="30" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              )}
            </div>

            {/* 3. 대칭 버튼 & 팝업 */}
            <div className="relative w-full flex justify-center">
              <ToolBtn active={activePopup === "symmetry"} onClick={() => togglePopup("symmetry")} title="대칭선 조절">
                <SymmetryIcon />
              </ToolBtn>

              {activePopup === "symmetry" && (
                <div className="absolute left-[calc(100%+16px)] top-1/2 -translate-y-1/2 w-64 bg-slate-900/95 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 border-y-8 border-y-transparent border-r-8 border-r-slate-900/95" />
                  <div className="flex justify-between items-center mb-3 text-xs font-bold text-slate-400">
                    <span>대칭 개수</span>
                    <span className="text-indigo-400">{symmetry}</span>
                  </div>
                  <input
                    type="range" min="2" max="24" step="2" value={symmetry} onChange={(e) => setSymmetry(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-400"
                  />
                  <div className="mt-3 flex justify-between px-1 text-[10px] text-slate-500 font-bold">
                    <span>2</span><span>8</span><span>16</span><span>24</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 기록 모음 */}
          <div className="flex flex-col gap-2 pt-1 w-full">
            <ToolBtn disabled={!drawing.canUndo} onClick={drawing.handleUndo} title="뒤로 가기"><UndoIcon /></ToolBtn>
            <ToolBtn disabled={!drawing.canRedo} onClick={drawing.handleRedo} title="앞으로 가기"><RedoIcon /></ToolBtn>
            <ToolBtn onClick={() => { drawing.handleClearCanvas(); setActivePopup(null); }} title="전체 지우기"><TrashIcon /></ToolBtn>
          </div>
        </div>

        {/* ─── 우측 캔버스 영역 ─── */}
        <div
          className="flex flex-1 flex-col items-center justify-center min-w-0 h-full gap-4 relative z-0"
          onPointerDown={(e) => {
            // 캔버스 그리기 시작할 때 무조건 팝업 닫기
            setActivePopup(null);
          }}
        >
          {/* 캔버스 래퍼 */}
          <div className="w-full max-w-[800px] aspect-square min-h-0 relative shadow-[0_24px_80px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden ring-1 ring-white/10">
            <DailyMandalaCanvas drawing={drawing} symmetry={symmetry} tool={tool} />
          </div>

          {/* 하단 상태바 */}
          <div className="w-full max-w-[800px] shrink-0 rounded-2xl border border-cyan-100/15 bg-slate-900/55 px-5 py-3 backdrop-blur-md">
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
    </div>
  );

  if (!isModal) { return content; }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-4 text-slate-100">
      <button type="button" aria-label="모달 닫기" onClick={handleClose} className="absolute inset-0 h-full w-full cursor-default" />
      <div className="relative z-10 w-full max-w-7xl h-[94vh] overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        {content}
      </div>
    </div>
  );
}

export default DailyDetailView;