// 도화지 / UI
import React from "react";

interface DrawingCanvasProps {
  canvasRef: React.Ref<HTMLCanvasElement>;
  onPointerDown: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerUp: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLCanvasElement>;
  cursor: string;
}

export const DrawingCanvas = React.memo(function DrawingCanvas({
  canvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  cursor,
}: DrawingCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      // 🚨 핵심 수정: absolute inset-0 block을 넣어 부모 영역과 100% 일치시킴
      className="absolute inset-0 w-full h-full touch-none block rounded-2xl"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
});
