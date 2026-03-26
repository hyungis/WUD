// 드로잉 엔진

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ── Flood‑fill (기존과 동일) ── */
function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string,
  boundaryCtx?: CanvasRenderingContext2D | null,
  tolerance = 32
) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // 경계 정보가 있는 경우 해당 데이터도 가져옴
  let boundaryData: Uint8ClampedArray | null = null;
  if (boundaryCtx) {
    boundaryData = boundaryCtx.getImageData(0, 0, w, h).data;
  }

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

  // 이미 같은 색이면 중단
  if (sr === fr && sg === fg && sb === fb && sa === fa) return;

  const stack = [sx, sy];
  const visited = new Uint8Array(w * h);

  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const pi = cy * w + cx;

    if (visited[pi]) continue;
    visited[pi] = 1;

    const ci = pi * 4;

    // 현재 캔버스의 색상이 시작점과 일치하는지 확인
    const isMatch =
      Math.abs(data[ci] - sr) <= tolerance &&
      Math.abs(data[ci + 1] - sg) <= tolerance &&
      Math.abs(data[ci + 2] - sb) <= tolerance &&
      Math.abs(data[ci + 3] - sa) <= tolerance;

    if (!isMatch) continue;

    // 경계가 있는 경우, 경계 레이어에 "의미 있는 선"이 있는지 확인
    if (boundaryData) {
      const r = boundaryData[ci], g = boundaryData[ci + 1], b = boundaryData[ci + 2], a = boundaryData[ci + 3];
      // 선으로 간주: 불투명하면서 충분히 어두운 색상 (검은색/회색 계열)
      const isLine = a > 50 && (r + g + b) / 3 < 200;
      if (isLine) continue;
    }

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
  boundaryCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function useCanvasDrawing({
  paintColor,
  brushSize,
  tool,
  symmetry = 1,
  boundaryCanvasRef,
}: UseCanvasDrawingProps) {
  const MAX_HISTORY_STEPS = 30;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  
  // 브러시 속성들을 Ref로 관리하여 쓰기 동작 시 최신 값을 즉시 참조하고, 
  // 포인터 이벤트 핸들러가 자주 바뀌어 렉이 걸리는 현상을 방지함
  const brushSizeRef = useRef(brushSize);
  const paintColorRef = useRef(paintColor);
  const toolRef = useRef(tool);

  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { paintColorRef.current = paintColor; }, [paintColor]);
  useEffect(() => { toolRef.current = tool; }, [tool]);

  // 🚨 Undo / Redo 상태 관리
  const historyRef = useRef<ImageData[]>([]);
  const historyStepRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // 현재 캔버스 상태를 역사(History)에 저장하는 함수
  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // 새로운 그림을 그리면 앞으로 가기(Redo) 기록은 삭제
      historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
      historyRef.current.push(data);
      
      if (historyRef.current.length > MAX_HISTORY_STEPS) {
        historyRef.current.shift();
        historyStepRef.current = historyRef.current.length - 1;
      } else {
        historyStepRef.current += 1;
      }

      setCanUndo(historyStepRef.current > 0);
      setCanRedo(historyStepRef.current < historyRef.current.length - 1);
    } catch (e) {
      console.warn("Failed to save history:", e);
    }
  }, [MAX_HISTORY_STEPS]);

  // 외부에서 캔버스를 수동으로 업데이트한 후 호출하는 초기화 함수
  const resetHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [data];
      historyStepRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    } catch (e) {
      console.warn("Failed to reset history:", e);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyStepRef.current > 0) {
      historyStepRef.current -= 1;
      const data = historyRef.current[historyStepRef.current];
      canvasRef.current?.getContext("2d")?.putImageData(data, 0, 0);
      setCanUndo(historyStepRef.current > 0);
      setCanRedo(true);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyStepRef.current += 1;
      const data = historyRef.current[historyStepRef.current];
      canvasRef.current?.getContext("2d")?.putImageData(data, 0, 0);
      setCanUndo(true);
      setCanRedo(historyStepRef.current < historyRef.current.length - 1);
    }
  }, []);

  /* 캔버스 초기화 & 리사이즈 방어 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // getBoundingClientRect 대신 offsetWidth/Height 사용 (Transform 영향 방지 및 성능)
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      if (width === 0 || height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const newW = Math.round(width * dpr);
      const newH = Math.round(height * dpr);

      // 실제 픽셀 크기가 바뀌지 않았다면 아무것도 안함 (애니메이션 도중 중복 redraw 방지)
      if (canvas.width === newW && canvas.height === newH) return;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width || 1;
      tempCanvas.height = canvas.height || 1;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx && canvas.width > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvasSizeRef.current = { width, height };
      canvas.width = newW;
      canvas.height = newH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      // 이전 내용을 복구 (비율 유지)
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, width, height);

      if (historyRef.current.length === 0) saveHistory();
    };
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [saveHistory]);

  const getPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    // nativeEvent.offsetX / offsetY를 사용하여 레이아웃 리플로우(reflow) 방지
    return {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (e) { /* ignore */ }

    if (toolRef.current === "fill") {
      const dpr = window.devicePixelRatio || 1;
      const point = getPoint(event);
      const boundaryCtx = boundaryCanvasRef?.current?.getContext("2d");
      floodFill(ctx, point.x * dpr, point.y * dpr, paintColorRef.current, boundaryCtx);
      saveHistory();
      return;
    }
    isDrawingRef.current = true;
    lastPointRef.current = getPoint(event);
  }, [getPoint, saveHistory, boundaryCanvasRef]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const point = getPoint(event);
    const lastPoint = lastPointRef.current;
    if (!lastPoint) { lastPointRef.current = point; return; }

    const curTool = toolRef.current;
    const curBrushSize = brushSizeRef.current;
    const curColor = paintColorRef.current;

    if (curTool === "eraser") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = curBrushSize * 2;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    } else {
      const segments = Math.max(1, symmetry);
      ctx.lineWidth = curBrushSize;
      ctx.strokeStyle = curColor;

      if (segments === 1) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      } else {
        const { width, height } = canvasSizeRef.current;
        const centerX = width / 2;
        const centerY = height / 2;
        const step = (Math.PI * 2) / segments;
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
    }
    lastPointRef.current = point;
  }, [symmetry, getPoint]);

  const handlePointerUp = useCallback(() => {
    if (isDrawingRef.current) {
      saveHistory();
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, [saveHistory]);

  const handlePointerCancel = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const handleClearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  }, [saveHistory]);

  return useMemo(() => ({
    canvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleClearCanvas,
    canvasSize: canvasSizeRef.current,
    handleUndo,
    handleRedo,
    resetHistory,
    saveHistory,
    canUndo,
    canRedo,
  }), [
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleClearCanvas,
    handleUndo,
    handleRedo,
    resetHistory,
    saveHistory,
    canUndo,
    canRedo,
  ]);
}
