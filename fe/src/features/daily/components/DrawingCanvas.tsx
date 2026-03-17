// 도화지 / UI
import React from "react";

interface DrawingCanvasProps {
  canvasRef: React.Ref<HTMLCanvasElement>;
  onPointerDown: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerUp: React.PointerEventHandler<HTMLCanvasElement>;
  cursor: string;
}

export function DrawingCanvas({
  canvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  cursor,
}: DrawingCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      // 🚨 핵심 수정: absolute inset-0 block을 넣어 부모 영역과 100% 일치시킴
      className="absolute inset-0 w-full h-full touch-none block"
      style={{ cursor, backgroundColor: "#ffffff" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
}