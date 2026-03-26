import { DrawingCanvas } from "../../../components/shared/DrawingCanvas";
import { useCanvasDrawing } from "../../../hooks/useCanvasDrawing";
import type { ToolType } from "../../../hooks/useCanvasDrawing";
import { getToolCursor } from "../../../utils/toolCursors";

interface DailyMandalaCanvasProps {
  drawing: ReturnType<typeof useCanvasDrawing>;
  symmetry: number;
  tool: ToolType;
  paintColor: string;
  brushSize: number;
}

export function DailyMandalaCanvas({
  drawing,
  symmetry,
  tool,
  paintColor,
  brushSize,
}: DailyMandalaCanvasProps) {
  const cursor = getToolCursor(tool, paintColor, 18 + brushSize * 2);

  return (
    <div
      className="w-full h-full overflow-hidden rounded-2xl bg-white"
      style={{ position: "relative", zIndex: 30, isolation: "isolate" }}
    >
      <DrawingCanvas
        canvasRef={drawing.canvasRef}
        onPointerDown={drawing.handlePointerDown}
        onPointerMove={drawing.handlePointerMove}
        onPointerUp={drawing.handlePointerUp}
        onPointerCancel={drawing.handlePointerCancel}
        cursor={cursor}
      />

      {/* 대칭 가이드 선 - ported from DailyDetailView.tsx */}
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
  );
}
