import { useEffect, useRef } from "react";
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
  const cursor = getToolCursor(tool, paintColor, 18 + brushSize * 2);
  const hasLoadedRef = useRef(false);

  // 명화 윤곽선 이미지를 상단 boundaryCanvas에 로드
  useEffect(() => {
    if (hasLoadedRef.current) return;
    const boundaryCanvas = boundaryCanvasRef.current;
    if (!boundaryCanvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const bCtx = boundaryCanvas.getContext("2d");
      if (!bCtx) return;

      const checkAndDraw = () => {
        const rect = boundaryCanvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          requestAnimationFrame(checkAndDraw);
          return;
        }

        // 고해상도 대응 (DPR 적용)
        const dpr = window.devicePixelRatio || 1;
        boundaryCanvas.width = rect.width * dpr;
        boundaryCanvas.height = rect.height * dpr;
        bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 명화 윤곽선 그리기
        bCtx.clearRect(0, 0, rect.width, rect.height);
        bCtx.drawImage(img, 0, 0, rect.width, rect.height);

        // 히스토리 리셋 및 로드 완료 표시
        drawing.resetHistory();
        hasLoadedRef.current = true;
      };
      checkAndDraw();
    };
    img.src = outlineUrl;
  }, [outlineUrl, drawing, boundaryCanvasRef]);

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
