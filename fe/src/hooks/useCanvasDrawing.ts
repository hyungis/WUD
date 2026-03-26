// 드로잉 엔진

import { useCallback, useEffect, useRef, useState } from "react";

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

  // 🚨 Undo / Redo 상태 관리
  const historyRef = useRef<ImageData[]>([]);
  const historyStepRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // 현재 캔버스 상태를 역사(History)에 저장하는 함수
  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || canvas.width === 0) return;

    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // 새로운 그림을 그리면 앞으로 가기(Redo) 기록은 삭제
      historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
      historyRef.current.push(data);
      if (historyRef.current.length > MAX_HISTORY_STEPS) {
        historyRef.current.shift();
      }
      historyStepRef.current = historyRef.current.length - 1;

      setCanUndo(historyStepRef.current > 0);
      setCanRedo(historyStepRef.current < historyRef.current.length - 1);
    } catch (e) {
      console.warn("Failed to save history:", e);
    }
  }, [MAX_HISTORY_STEPS]);

  // 외부(useEffect 등)에서 캔버스를 수동으로 업데이트한 후 호출하는 초기화 함수
  const resetHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || canvas.width === 0) return;

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

  const finalizeStrokeIfNeeded = useCallback(() => {
    if (!isDrawingRef.current) return;
    saveHistory();
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, [saveHistory]);

  const handleUndo = useCallback(() => {
    finalizeStrokeIfNeeded();
    if (historyStepRef.current > 0) {
      historyStepRef.current -= 1;
      const data = historyRef.current[historyStepRef.current];
      canvasRef.current?.getContext("2d")?.putImageData(data, 0, 0);
      setCanUndo(historyStepRef.current > 0);
      setCanRedo(true);
    }
  }, [finalizeStrokeIfNeeded]);

  const handleRedo = useCallback(() => {
    finalizeStrokeIfNeeded();
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyStepRef.current += 1;
      const data = historyRef.current[historyStepRef.current];
      canvasRef.current?.getContext("2d")?.putImageData(data, 0, 0);
      setCanUndo(true);
      setCanRedo(historyStepRef.current < historyRef.current.length - 1);
    }
  }, [finalizeStrokeIfNeeded]);

  /* 캔버스 초기화 & 리사이즈 방어 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      if (width === 0 || height === 0) return;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width || 1;
      tempCanvas.height = canvas.height || 1;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx && canvas.width > 0) tempCtx.drawImage(canvas, 0, 0);

      const dpr = window.devicePixelRatio || 1;
      canvasSizeRef.current = { width, height };
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // 물리적 픽셀 변경 후 tempCanvas 원상복구
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, width, height);

      // 초기 로드 시 빈 화면을 첫 히스토리로 저장
      if (historyRef.current.length === 0) saveHistory();
    };
    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [saveHistory]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = paintColor;
  }, [brushSize, paintColor]);

  const getPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const transform = ctx?.getTransform();
    const transformX = transform?.a || 1;
    const transformY = transform?.d || 1;

    // CSS 표시 크기(rect)와 내부 버퍼(canvas.width/height) 비율을 이용해 좌표를 정규화한다.
    // brush/eraser는 논리 좌표(CSS px)를 사용하고, fill은 아래에서 dpr을 곱해 내부 픽셀 좌표로 변환한다.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * (scaleX / transformX),
      y: (event.clientY - rect.top) * (scaleY / transformY),
    };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // 일부 환경에서는 포인터 캡처가 실패할 수 있으므로 무시
    }

    if (tool === "fill") {
      if (historyRef.current.length === 0) saveHistory();
      const dpr = window.devicePixelRatio || 1;
      const point = getPoint(event);
      const boundaryCtx = boundaryCanvasRef?.current?.getContext("2d");
      floodFill(ctx, point.x * dpr, point.y * dpr, paintColor, boundaryCtx);
      saveHistory(); // 채우기 후 히스토리 저장
      return;
    }
    if (historyRef.current.length === 0) saveHistory();
    isDrawingRef.current = true;
    lastPointRef.current = getPoint(event);
  }, [tool, paintColor, getPoint, saveHistory, boundaryCanvasRef]);

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

  const handlePointerUp = useCallback((event?: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      saveHistory(); // 선 긋기 완료 후 히스토리 저장
    }
    const canvas = canvasRef.current;
    if (canvas && event) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // 캡처 해제 실패는 기능상 치명적이지 않으므로 무시
      }
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, [saveHistory]);

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerUp(event);
  }, [handlePointerUp]);

  const handleClearCanvas = useCallback(() => {
    finalizeStrokeIfNeeded();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory(); // 지우기 후 히스토리 저장
  }, [finalizeStrokeIfNeeded, saveHistory]);

  return {
    canvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleClearCanvas,
    canvasSize: canvasSizeRef.current,
    handleUndo,  // 밖으로 꺼내줌
    handleRedo,  // 밖으로 꺼내줌
    resetHistory, // 히스토리 리셋용 (단계 전환 등)
    saveHistory,  // 수동 저장용 (이미지 로드 후 등)
    canUndo,     // 상태 UI용
    canRedo,     // 상태 UI용
  };
}
