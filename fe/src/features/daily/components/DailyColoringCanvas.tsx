import { useEffect, useMemo, useRef } from "react";
import { DrawingCanvas } from "../../../components/shared/DrawingCanvas";
import { useCanvasDrawing } from "../../../hooks/useCanvasDrawing";
import type { ToolType } from "../../../hooks/useCanvasDrawing";
import { getToolCursor } from "../../../utils/toolCursors";

interface DailyColoringCanvasProps {
  drawing: ReturnType<typeof useCanvasDrawing>;
  tool: ToolType;
  paintColor: string;
  outlineUrl: string;
  brushSize: number;
  boundaryCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function DailyColoringCanvas({
  drawing,
  tool,
  paintColor,
  outlineUrl,
  brushSize,
  boundaryCanvasRef,
}: DailyColoringCanvasProps) {
  const cursor = useMemo(() => getToolCursor(tool, paintColor, 18 + brushSize * 2), [tool, paintColor, brushSize]);
  const hasLoadedRef = useRef(false);

  // 명화 윤곽선 이미지를 상단 boundaryCanvas에 로드 및 리사이즈 감지
  useEffect(() => {
    const boundaryCanvas = boundaryCanvasRef.current;
    if (!boundaryCanvas) return;

    let observer: ResizeObserver | null = null;
    let isActive = true;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!isActive) return;
      const bCtx = boundaryCanvas.getContext("2d");
      if (!bCtx) return;

      const checkAndDraw = () => {
        if (!isActive) return;
        const width = boundaryCanvas.offsetWidth;
        const height = boundaryCanvas.offsetHeight;
        if (width === 0 || height === 0) {
          requestAnimationFrame(checkAndDraw);
          return;
        }

        const dpr = window.devicePixelRatio || 1;
        // 캔버스 크기가 달라지지 않았다면 다시 그리지 않음
        if (boundaryCanvas.width === Math.round(width * dpr) && boundaryCanvas.height === Math.round(height * dpr)) {
          return;
        }

        boundaryCanvas.width = width * dpr;
        boundaryCanvas.height = height * dpr;
        bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 명화 윤곽선 그리기
        bCtx.clearRect(0, 0, width, height);
        bCtx.drawImage(img, 0, 0, width, height);

        // 최초 로드 시에만 히스토리 리셋
        if (!hasLoadedRef.current) {
          drawing.resetHistory();
          hasLoadedRef.current = true;
        }
      };

      // 초기 1회 그리기 실행
      checkAndDraw();

      // 이후 사이즈 변경 감지
      observer = new ResizeObserver(() => checkAndDraw());
      observer.observe(boundaryCanvas);
    };
    img.src = outlineUrl;

    return () => {
      isActive = false;
      if (observer) observer.disconnect();
    };
  }, [outlineUrl, drawing.resetHistory, boundaryCanvasRef]);

  return (
    <div
      className="w-full h-full overflow-hidden rounded-2xl"
      style={{ position: "relative", zIndex: 30, isolation: "isolate" }}
    >
      {/* 1. 최하단: 흰색 배경 */}
      <div
        className="absolute inset-0 bg-white"
        style={{ zIndex: 1, pointerEvents: "none" }}
      />

      {/* 2. 중간: 사용자가 색칠하는 드로잉 캔버스 */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "auto" }}>
        <DrawingCanvas
          canvasRef={drawing.canvasRef}
          onPointerDown={drawing.handlePointerDown}
          onPointerMove={drawing.handlePointerMove}
          onPointerUp={drawing.handlePointerUp}
          cursor={cursor}
        />
      </div>

      {/* 3. 최상단: 명화 윤곽선 레이어 (클릭 방지 + 블렌딩) */}
      <canvas
        ref={boundaryCanvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ zIndex: 3, pointerEvents: "none", mixBlendMode: "multiply" }}
      />
    </div>
  );
}
