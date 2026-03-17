import { DrawingCanvas } from "./DrawingCanvas";
import { useCanvasDrawing } from "../hooks/useCanvasDrawing";
import type { ToolType } from "../hooks/useCanvasDrawing";

interface DailyMandalaCanvasProps {
  drawing: ReturnType<typeof useCanvasDrawing>;
  symmetry: number;
  tool: ToolType;
}

export function DailyMandalaCanvas({
  drawing,
  symmetry,
  tool,
}: DailyMandalaCanvasProps) {
  // cursor style per tool - ported from DailyDetailView.tsx
  const cursor = tool === "fill" ? "crosshair" : tool === "eraser" ? "cell" : "default";

  return (
    <div
      className="mandala-surface mandala-surface-white w-full max-w-md aspect-square mx-auto overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10"
      style={{ position: "relative", zIndex: 30, isolation: "isolate" }}
    >
      <DrawingCanvas
        canvasRef={drawing.canvasRef}
        onPointerDown={drawing.handlePointerDown}
        onPointerMove={drawing.handlePointerMove}
        onPointerUp={drawing.handlePointerUp}
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
