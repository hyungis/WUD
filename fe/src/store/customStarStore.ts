import { create } from "zustand";

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

// ── localStorage 키 ──
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
  /** localStorage에 현재 설정 저장 */
  saveToStorage: () => void;
  /** 추후 백엔드 PATCH API 연동용 (추상화) */
  saveToBackend: () => Promise<void>;
};

// ── 초기값 로드 ──
function loadInitial(): { shape: StarShape; color: string } {
  try {
    const shape = (localStorage.getItem(LS_SHAPE_KEY) as StarShape) || DEFAULT_SHAPE;
    const color = localStorage.getItem(LS_COLOR_KEY) || DEFAULT_COLOR;
    // shape 유효성 검사
    const validShape = STAR_SHAPES.some((s) => s.key === shape) ? shape : DEFAULT_SHAPE;
    return { shape: validShape, color };
  } catch {
    return { shape: DEFAULT_SHAPE, color: DEFAULT_COLOR };
  }
}

const initial = loadInitial();

export const useCustomStarStore = create<CustomStarState>((set, get) => ({
  currentShape: initial.shape,
  currentColor: initial.color,
  animationTrigger: 0,

  setShape: (shape) =>
    set((state) => ({
      currentShape: shape,
      animationTrigger: state.animationTrigger + 1,
    })),

  setColor: (color) =>
    set((state) => ({
      currentColor: color,
      animationTrigger: state.animationTrigger + 1,
    })),

  saveToStorage: () => {
    const { currentShape, currentColor } = get();
    try {
      localStorage.setItem(LS_SHAPE_KEY, currentShape);
      localStorage.setItem(LS_COLOR_KEY, currentColor);
    } catch (e) {
      console.error("Failed to save custom star settings:", e);
    }
  },

  // 추후 백엔드 연동 시 구현: PATCH /api/users/me/star
  saveToBackend: async () => {
    const { currentShape, currentColor } = get();
    console.log("[customStarStore] saveToBackend placeholder:", { currentShape, currentColor });
    // await api.patch("/api/users/me/star", { shape: currentShape, color: currentColor });
  },
}));
