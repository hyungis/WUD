// 그리기 엔진 / Logic
import { useCallback, useEffect, useRef } from "react";

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

export type ToolType = "brush" | "fill" | "eraser";

interface UseCanvasDrawingProps {
  paintColor: string;
  brushSize: number;
  tool: ToolType;
  symmetry?: number;
}

export function useCanvasDrawing({
  paintColor,
  brushSize,
  tool,
  symmetry = 1,
}: UseCanvasDrawingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  /* 🚨 캔버스 초기화 & 리사이즈 방어 로직 (ResizeObserver 적용) */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      // CSS 레이아웃이 잡히기 전(0x0)이면 무시
      if (rect.width === 0 || rect.height === 0) return;

      // 1. 기존 캔버스 그림 백업
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width || 1;
      tempCanvas.height = canvas.height || 1;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx && canvas.width > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      // 2. 캔버스 물리적 픽셀 크기 재설정
      const dpr = window.devicePixelRatio || 1;
      canvasSizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);

      // 3. 백업해둔 그림 다시 그리기
      ctx.drawImage(
        tempCanvas,
        0, 0, tempCanvas.width, tempCanvas.height,
        0, 0, rect.width, rect.height
      );
    };

    // 창 크기 조절이나 레이아웃 변경 시 실시간 감지
    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []); // 마운트 시 한 번만 등록

  /* 브러시 속성 업데이트 */
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = paintColor;
  }, [brushSize, paintColor]);

  /* 마우스 좌표 가져오기 */
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

  return {
    canvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleClearCanvas,
    canvasSize: canvasSizeRef.current,
  };
}