import { create } from "zustand";
import { starApi } from "../api/star";

// ── Shape 종류 (8종) ──
export type StarShape =
  | "sphere"
  | "box"
  | "octahedron"
  | "icosahedron"
  | "torusKnot"
  | "dodecahedron"
  | "tetrahedron"
  | "stellated";

export const STAR_SHAPES: { key: StarShape; label: string; icon: string }[] = [
  { key: "sphere", label: "구체", icon: "◉" },
  { key: "box", label: "큐브", icon: "◆" },
  { key: "octahedron", label: "팔면체", icon: "◇" },
  { key: "icosahedron", label: "이십면체", icon: "⬡" },
  { key: "torusKnot", label: "토러스 매듭", icon: "∞" },
  { key: "dodecahedron", label: "십이면체", icon: "⬠" },
  { key: "tetrahedron", label: "피라미드", icon: "△" },
  { key: "stellated", label: "별 다면체", icon: "✦" },
];

// ── Color 팔레트 (8종) ──
export const STAR_COLORS: { hex: string; label: string }[] = [
  { hex: "#facc15", label: "별빛 골드" },
  { hex: "#34d399", label: "오로라 민트" },
  { hex: "#a78bfa", label: "코스믹 퍼플" },
  { hex: "#f472b6", label: "네뷸라 핑크" },
  { hex: "#38bdf8", label: "오션 블루" },
  { hex: "#fb923c", label: "선셋 코랄" },
  { hex: "#e2e8f0", label: "스타더스트 화이트" },
  { hex: "#818cf8", label: "딥 라벤더" },
];

// ── localStorage 키 (레거시 지원용) ──
const LS_SHAPE_KEY = "customStarShape";
const LS_COLOR_KEY = "customStarColor";

// ── 기본값 ──
const DEFAULT_SHAPE: StarShape = "stellated";
const DEFAULT_COLOR = "#facc15";

// ── Store 타입 ──
type CustomStarState = {
  currentShape: StarShape;
  currentColor: string;
  /** 모양/색상 변경 시 증가 → 스케일 애니메이션 트리거 */
  animationTrigger: number;

  setShape: (shape: StarShape) => void;
  setColor: (color: string) => void;
  /** 백엔드에서 현재 설정 조회 */
  fetchCenterStar: () => Promise<void>;
  /** 백엔드 API 연동 */
  saveToBackend: () => Promise<void>;
  /** 상태 초기화 (로그아웃 시 사용) */
  clearStore: () => void;
};

export const useCustomStarStore = create<CustomStarState>((set, get) => ({
  currentShape: DEFAULT_SHAPE,
  currentColor: DEFAULT_COLOR,
  animationTrigger: 0,

  setShape: (shape: StarShape) =>
    set((state) => ({
      currentShape: shape,
      animationTrigger: state.animationTrigger + 1,
    })),

  setColor: (color: string) =>
    set((state) => ({
      currentColor: color,
      animationTrigger: state.animationTrigger + 1,
    })),

  fetchCenterStar: async () => {
    try {
      const res = await starApi.getCenterStar();
      if (res.success && res.data) {
        const { shapeType, color } = res.data;
        set((state) => ({
          currentShape: shapeType as StarShape,
          currentColor: color,
          animationTrigger: state.animationTrigger + 1,
        }));
      }
    } catch (e) {
      console.error("Failed to fetch center star:", e);
    }
  },

  saveToBackend: async () => {
    const { currentShape, currentColor } = get();
    try {
      await starApi.updateCenterStar({
        shapeType: currentShape,
        color: currentColor,
      });
    } catch (e) {
      console.error("Failed to save center star to backend:", e);
      throw e;
    }
  },

  clearStore: () => {
    set({
      currentShape: DEFAULT_SHAPE,
      currentColor: DEFAULT_COLOR,
      animationTrigger: 0,
    });
    // 레거시 로컬스토리지 데이터 삭제
    localStorage.removeItem(LS_SHAPE_KEY);
    localStorage.removeItem(LS_COLOR_KEY);
  },
}));
