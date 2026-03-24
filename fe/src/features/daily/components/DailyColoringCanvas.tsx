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
}

export function DailyColoringCanvas({
  drawing,
  tool,
  paintColor,
  outlineUrl,
  brushSize,
}: DailyColoringCanvasProps) {
  const cursor = getToolCursor(tool, paintColor, 18 + brushSize * 2);
  const overlayRef = useRef<HTMLImageElement | null>(null);
  const hasLoadedRef = useRef(false);

  // 캔버스에 윤곽선 이미지를 배경으로 로드
  useEffect(() => {
    if (hasLoadedRef.current) return;
    const canvas = drawing.canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 캔버스가 아직 리사이즈 되지 않은 경우 대기
      const checkAndDraw = () => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          requestAnimationFrame(checkAndDraw);
          return;
        }

        // 흰색 배경 위에 윤곽선 이미지 그리기
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);

        // 히스토리 리셋 (윤곽선 포함 상태가 초기 상태)
        drawing.resetHistory();
        hasLoadedRef.current = true;
      };
      checkAndDraw();
    };
    img.src = outlineUrl;
  }, [outlineUrl, drawing]);

  return (
    <div
      className="w-full h-full overflow-hidden rounded-2xl"
      style={{ position: "relative", zIndex: 30, isolation: "isolate" }}
    >
      <DrawingCanvas
        canvasRef={drawing.canvasRef}
        onPointerDown={drawing.handlePointerDown}
        onPointerMove={drawing.handlePointerMove}
        onPointerUp={drawing.handlePointerUp}
        cursor={cursor}
      />

      {/* 윤곽선 오버레이 (포인터 이벤트 없이 시각적으로만 표시) */}
      <img
        ref={overlayRef}
        src={outlineUrl}
        alt="coloring outline"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-60 mix-blend-multiply"
        style={{ objectFit: "cover" }}
        draggable={false}
      />
    </div>
  );
}
