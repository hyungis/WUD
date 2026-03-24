// import type { ToolType } from "../hooks/useCanvasDrawing";

// /*
//  * 도구 아이콘 자체를 커서로 사용한다.
//  * 각 도구마다 실제 접촉점(펜촉/물감방울/지우개 모서리)에 hotspot을 개별 매핑한다.
//  */

// function svgCursor(svg: string, hotspotX: number, hotspotY: number): string {
//   const base64 = btoa(svg);
//   return `url("data:image/svg+xml;base64,${base64}") ${hotspotX} ${hotspotY}, crosshair`;
// }

// function normalizeCursorSize(size?: number): number {
//   if (!size || Number.isNaN(size)) return 24;
//   return Math.min(40, Math.max(18, Math.round(size)));
// }

// function buildEraserCursor(size: number): string {
//   return (
//     `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'>` +
//     "<path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21' fill='%23ffffff' stroke='%23000000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/>" +
//     "<path d='M22 21H7' fill='none' stroke='%23000000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/>" +
//     "</svg>"
//   );
// }

// function buildBrushCursor(size: number): string {
//   return (
//     `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'>` +
//     "<path d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' fill='%23ffffff' stroke='%23000000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/>" +
//     "<path d='m15 5 4 4' fill='none' stroke='%23000000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/>" +
//     "</svg>"
//   );
// }

// function buildFillCursor(size: number): string {
//   return (
//     `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'>` +
//     "<path d='m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z' fill='%23ffffff' stroke='%23000000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/>" +
//     "<path d='M22 20c0 .8-.7 1.7-1.5 1.7S19 20.8 19 20s1.5-2.8 1.5-2.8S22 19.2 22 20Z' fill='%23ffffff' stroke='%23000000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/>" +
//     "</svg>"
//   );
// }

// export function getToolCursor(tool: ToolType, _selectedColor?: string, cursorSize?: number): string {
//   const size = normalizeCursorSize(cursorSize);
//   const scale = size / 24;

//   switch (tool) {
//     case "brush":
//       return svgCursor(buildBrushCursor(size), Math.round(3 * scale), Math.round(21 * scale));
//     case "fill":
//       return svgCursor(buildFillCursor(size), Math.round(20 * scale), Math.round(20 * scale));
//     case "eraser":
//       return svgCursor(buildEraserCursor(size), Math.round(7 * scale), Math.round(21 * scale));
//   }
// }
import type { ToolType } from "../hooks/useCanvasDrawing";

/*
 * 도구 아이콘 자체를 커서로 사용한다.
 * 각 도구마다 실제 접촉점(펜촉/물감방울/지우개 모서리)에 hotspot을 개별 매핑한다.
 */

function svgCursor(svg: string, hotspotX: number, hotspotY: number): string {
  const base64 = btoa(svg);
  return `url("data:image/svg+xml;base64,${base64}") ${hotspotX} ${hotspotY}, crosshair`;
}

function normalizeCursorSize(size?: number): number {
  if (!size || Number.isNaN(size)) return 24;
  return Math.min(40, Math.max(18, Math.round(size)));
}

function buildEraserCursor(size: number): string {
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'>` +
    `<path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21' fill='#ffffff' stroke='#000000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/>` +
    `<path d='M22 21H7' fill='none' stroke='#000000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/>` +
    `</svg>`
  );
}

function buildBrushCursor(size: number, color: string): string {
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'>` +
    `<path d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' fill='${color}' stroke='#000000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/>` +
    `<path d='m15 5 4 4' fill='none' stroke='#000000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/>` +
    `</svg>`
  );
}

function buildFillCursor(size: number, color: string): string {
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'>` +
    `<path d='m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z' fill='${color}' stroke='#000000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/>` +
    `<path d='M22 20c0 .8-.7 1.7-1.5 1.7S19 20.8 19 20s1.5-2.8 1.5-2.8S22 19.2 22 20Z' fill='${color}' stroke='#000000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/>` +
    `</svg>`
  );
}

export function getToolCursor(tool: ToolType, selectedColor: string = "#000000", cursorSize?: number): string {
  const size = normalizeCursorSize(cursorSize);
  const scale = size / 24;

  switch (tool) {
    case "brush":
      return svgCursor(buildBrushCursor(size, selectedColor), Math.round(3 * scale), Math.round(21 * scale));
    case "fill":
      return svgCursor(buildFillCursor(size, selectedColor), Math.round(20 * scale), Math.round(20 * scale));
    case "eraser":
      return svgCursor(buildEraserCursor(size), Math.round(7 * scale), Math.round(21 * scale));
  }
}