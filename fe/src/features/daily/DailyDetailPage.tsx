import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";

/* ── constants ── */
const PALETTE = [
  "#111827", "#374151", "#6B7280",
  "#F97316", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1",
  "#8B5CF6", "#EC4899", "#F43F5E",
];
const SYMMETRY_OPTIONS = [4, 6, 8, 12, 16];
const BRUSH_PRESETS = [2, 4, 6, 8, 12];

type ToolType = "brush" | "fill" | "eraser";

/* ── Flood‑fill ── */
function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string,
  tolerance = 32,
) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // parse target color
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = 1;
  const tctx = tmp.getContext("2d")!;
  tctx.fillStyle = fillColor;
  tctx.fillRect(0, 0, 1, 1);
  const [fr, fg, fb, fa] = tctx.getImageData(0, 0, 1, 1).data;

  const sx = Math.round(startX);
  const sy = Math.round(startY);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;

  const idx = (sy * w + sx) * 4;
  const sr = data[idx], sg = data[idx + 1], sb = data[idx + 2], sa = data[idx + 3];

  // if target same as fill, skip
  if (sr === fr && sg === fg && sb === fb && sa === fa) return;

  const match = (i: number) =>
    Math.abs(data[i] - sr) <= tolerance &&
    Math.abs(data[i + 1] - sg) <= tolerance &&
    Math.abs(data[i + 2] - sb) <= tolerance &&
    Math.abs(data[i + 3] - sa) <= tolerance;

  const stack = [sx, sy];
  const visited = new Uint8Array(w * h);

  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const pi = cy * w + cx;
    if (visited[pi]) continue;
    visited[pi] = 1;
    const ci = pi * 4;
    if (!match(ci)) continue;
    data[ci] = fr;
    data[ci + 1] = fg;
    data[ci + 2] = fb;
    data[ci + 3] = fa;
    if (cx > 0) stack.push(cx - 1, cy);
    if (cx < w - 1) stack.push(cx + 1, cy);
    if (cy > 0) stack.push(cx, cy - 1);
    if (cy < h - 1) stack.push(cx, cy + 1);
  }
  ctx.putImageData(imageData, 0, 0);
}

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
        ? "bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-400/50 shadow-[0_0_10px_rgba(99,102,241,0.25)]"
        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
        }`}
    >
      {children}
    </button>
  );
}

/* ── main page ── */
function DailyDetailPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  const [shellColor] = useState(() => localStorage.getItem("dailyMoodColor") || PALETTE[0]);
  const [paintColor, setPaintColor] = useState(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(4);
  const [symmetry, setSymmetry] = useState(8);
  const [symmetryInput, setSymmetryInput] = useState("8");
  const [tool, setTool] = useState<ToolType>("brush");

  const selectedColor = useMemo(() => shellColor, [shellColor]);

  /* canvas setup */
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvasSizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = paintColor;
  }, [brushSize, paintColor]);

  /* pointer helpers */
  const getPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    if (tool === "fill") {
      const dpr = window.devicePixelRatio || 1;
      const point = getPoint(event);
      floodFill(ctx, point.x * dpr, point.y * dpr, paintColor);
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = getPoint(event);
  }, [tool, paintColor, getPoint]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !isDrawingRef.current) return;
    const point = getPoint(event);
    const lastPoint = lastPointRef.current;
    if (!lastPoint) { lastPointRef.current = point; return; }

    const { width, height } = canvasSizeRef.current;
    const centerX = width / 2;
    const centerY = height / 2;

    if (tool === "eraser") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 2;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    } else {
      const segments = Math.max(1, symmetry);
      const step = (Math.PI * 2) / segments;
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = paintColor;
      for (let i = 0; i < segments; i += 1) {
        const angle = step * i;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const fromX = cos * (lastPoint.x - centerX) - sin * (lastPoint.y - centerY) + centerX;
        const fromY = sin * (lastPoint.x - centerX) + cos * (lastPoint.y - centerY) + centerY;
        const toX = cos * (point.x - centerX) - sin * (point.y - centerY) + centerX;
        const toY = sin * (point.x - centerX) + cos * (point.y - centerY) + centerY;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      }
    }
    lastPointRef.current = point;
  }, [tool, symmetry, brushSize, paintColor, getPoint]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const handleClearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

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

  /* cursor style per tool */
  const canvasCursor = tool === "fill" ? "crosshair" : tool === "eraser" ? "cell" : "default";
  const strokeDensity = Math.min(100, Math.round((brushSize / 12) * 100));

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 starfield z-20" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        {/* header */}
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
              Daily Detail
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-100 [font-family:'Manrope',sans-serif]">
              만다라 디테일
            </h1>
            <p className="mt-1 text-sm text-slate-400">오늘의 감정을 채워보세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate("/daily/content")}>
              선택으로
            </Button>
            <Button type="button" onClick={() => navigate("/dashboard")}>메인으로</Button>
          </div>
        </header>

        {/* ─── toolbar ─── */}
        <div className="shrink-0 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-5 py-4">
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
                className="w-11 rounded-lg border border-white/15 bg-slate-800/70 px-1.5 py-1.5 text-center text-xs text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 transition"
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
            {/* 감정 색 표시 */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-4 w-4 rounded-full ring-1 ring-white/20" style={{ backgroundColor: selectedColor }} />
              감정 색
            </div>

            <div className="h-6 w-px bg-white/10" />

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
                onClick={handleClearCanvas}
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
                  const drawingImage = canvasRef.current?.toDataURL("image/png") ?? null;
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
                  navigate("/daily/complete");
                }}
              >
                완료하기
              </Button>
            </div>
          </div>
        </div>

        {/* ─── canvas ─── */}
        <div className="mandala-surface mandala-surface-white flex-1 min-h-0 overflow-hidden" style={{ position: "relative", zIndex: 30, isolation: "isolate" }}>
          <canvas
            ref={canvasRef}
            className="daily-canvas h-full w-full touch-none"
            style={{ cursor: canvasCursor, backgroundColor: "#ffffff" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          {/* 대칭 가이드 선 */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            aria-hidden="true"
          >
            {Array.from({ length: symmetry }, (_, i) => {
              const angle = (2 * Math.PI * i) / symmetry;
              const cx = 50;
              const cy = 50;
              const len = 50;
              const x2 = cx + len * Math.cos(angle);
              const y2 = cy + len * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={`${cx}%`}
                  y1={`${cy}%`}
                  x2={`${x2}%`}
                  y2={`${y2}%`}
                  stroke="#cbd5e1"
                  strokeWidth="0.8"
                  opacity="0.4"
                />
              );
            })}
          </svg>
        </div>

        <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
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
}

export default DailyDetailPage;
