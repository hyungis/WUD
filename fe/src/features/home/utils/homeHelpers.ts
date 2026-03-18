export type DailyPlanet = {
  id: string;
  targetId?: number;
  shell: string;
  core: string;
  objectType?: "halo" | "shards" | "spark";
  objectColor?: string;
  memo: string;
  createdAt: string;
  isTemporary?: boolean;
};

export type DeepStar = {
  id: string;
  targetId?: number;
  constellationId?: number;
  toneColor: string;
  createdAt: string;
  weekKey?: string;
  label?: string;
  isTemporary?: boolean;
};

export type StarSceneProps = {
  dailyPlanets: DailyPlanet[];
  deepStars: DeepStar[];
  mypageStar: {
    id: string;
    createdAt: string;
    toneColor: string;
    label: string;
  };
  onStarClick: () => void;
  onDeepStarClick?: (star: DeepStar) => void;
  onPlanetClick: (planet: DailyPlanet) => void;
  onStarSelect?: (starId: string) => void;
  selectedStarId?: string | null;
  hoveredStarId?: string | null;
  selectedWeekKey?: string | null;
  onStarHover?: (data: { id: string | null; x?: number; y?: number }) => void;
  onViewModeChange?: (mode: "macro" | "micro") => void;
  isReportOpen: boolean;
  newbornStarId?: string | null;
};

export const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const gaussianRandom = (): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5;
  if (num > 1 || num < 0) return gaussianRandom();
  return num;
};

export const seededGaussian = (seed: number) => {
  return (seededRandom(seed) + seededRandom(seed + 1) + seededRandom(seed + 2)) / 3;
};

export const getWeekKey = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${weekNo}`;
};

export const formatDate = (value: string) => {
  const normalized = normalizeUtcTimestamp(value);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const formatDateTimeKST = (value: string) => {
  const normalized = normalizeUtcTimestamp(value);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}년 ${get("month")}월 ${get("day")}일 ${get("hour")}:${get("minute")}`;
};

function normalizeUtcTimestamp(value: string) {
  // If backend sends timezone-less ISO (e.g. 2026-03-11T19:01:00), treat it as UTC.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value)) {
    return `${value}Z`;
  }
  // Also support space-separated local-date time from backend (e.g. 2026-03-11 19:01:00).
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value)) {
    return `${value.replace(" ", "T")}Z`;
  }
  return value;
}

export const ZOOM_THRESHOLD = 120;
export const MAX_DISTANCE = 500;
export const MIN_DISTANCE = 6;

// ── 색상 분석 헬퍼 ──
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function getColorMood(hex: string): { label: string; desc: string } {
  try {
    const { h, s, l } = hexToHsl(hex);
    if (l < 20) return { label: "깊은 어둠", desc: "내면 깊은 곳에 머무르는 조용한 에너지가 느껴집니다." };
    if (l > 80) return { label: "밝은 여백", desc: "열린 마음과 가벼운 숨결이 감지됩니다." };
    if (s < 20) return { label: "차분한 중립", desc: "감정의 소용돌이 없이 고요하게 중심을 잡고 있습니다." };
    if (h < 30 || h >= 340) return { label: "열정적인 붉음", desc: "뜨거운 감정과 강한 의지가 표면으로 올라오고 있습니다." };
    if (h < 60) return { label: "생동하는 활기", desc: "따뜻한 에너지와 낙관적인 기운이 감돕니다." };
    if (h < 150) return { label: "치유의 초록", desc: "자연스러운 성장과 회복의 흐름이 나타납니다." };
    if (h < 200) return { label: "맑은 시안", desc: "명료한 사고와 자유로운 의식이 펼쳐집니다." };
    if (h < 260) return { label: "고요한 파랑", desc: "안정된 내면과 사색적인 에너지가 자리잡고 있습니다." };
    return { label: "신비로운 보라", desc: "직관과 상상이 교차하는 깊은 내면의 흐름입니다." };
  } catch { return { label: "미지의 색", desc: "특별한 감정의 조합이 감지됩니다." }; }
}

export function getObjectTypeAnalysis(type?: string): { label: string; desc: string } | null {
  if (!type) return null;
  if (type === "halo") return { label: "헤일로", desc: "주변을 감싸는 포용의 에너지. 타인을 향한 따뜻함이 오늘의 나를 감쌉니다." };
  if (type === "shards") return { label: "파편", desc: "날카로운 감각이 깨어있는 상태. 내면의 전환점 혹은 새로운 각성의 신호입니다." };
  if (type === "spark") return { label: "스파크", desc: "작지만 강렬한 점화. 지금 이 순간에 집중된 에너지가 빛납니다." };
  return null;
}

export function getDailyAnalysis(planet: DailyPlanet): { mood: ReturnType<typeof getColorMood>; object: ReturnType<typeof getObjectTypeAnalysis>; summary: string } {
  const mood = getColorMood(planet.shell);
  const object = getObjectTypeAnalysis(planet.objectType);
  const summary = "AI 분석이 완료되면 이 영역에 개인 맞춤 리포트가 표시됩니다.";
  return {
    mood: {
      ...mood,
      desc: "색채 기반 해석 문장은 AI 분석 완료 후 자동으로 채워집니다.",
    },
    object: object
      ? {
        ...object,
        desc: "오브젝트 해석 문장은 AI 분석 완료 후 자동으로 채워집니다.",
      }
      : null,
    summary,
  };
}

export function getDeepStarAnalysis(strokes: number | null | undefined, tone: string | null | undefined, toneColor: string): { energy: { label: string; desc: string }; tone: { label: string; desc: string }; summary: string } {
  const strokeCount = strokes ?? 0;
  const energy = strokeCount > 180
    ? { label: "활력 넘침", desc: "드로잉 에너지 해석 문장은 AI 분석 완료 후 자동으로 채워집니다." }
    : strokeCount > 80
      ? { label: "안정된 흐름", desc: "드로잉 에너지 해석 문장은 AI 분석 완료 후 자동으로 채워집니다." }
      : { label: "여백의 고요", desc: "드로잉 에너지 해석 문장은 AI 분석 완료 후 자동으로 채워집니다." };

  const colorMood = getColorMood(toneColor);
  const toneLabel = tone || colorMood.label;
  const toneResult = {
    label: toneLabel,
    desc: "내면 색채 해석 문장은 AI 분석 완료 후 자동으로 채워집니다.",
  };

  const summary = "AI 분석이 완료되면 이 영역에 HTP 기반 개인 맞춤 리포트가 표시됩니다.";
  return { energy, tone: toneResult, summary };
}
// ── 기타 유틸리티 ──
const DAILY_COLORS = ["#7dd3fc", "#38bdf8", "#22d3ee", "#60a5fa", "#93c5fd"];
const DEEP_COLORS = ["#fcd34d", "#f59e0b", "#fb923c", "#fbbf24", "#fde68a"];

export const colorFromId = (id: string, kind: "DAILY" | "DEEP") => {
  const n = Number(id);
  const index = Number.isNaN(n) ? 0 : Math.abs(n) % 5;
  return kind === "DEEP" ? DEEP_COLORS[index] : DAILY_COLORS[index];
};

export const normalizeDeepReportText = (text?: string) => {
  if (!text) return "";
  return text
    .replace(/\r/g, "")
    .replace(/\n\s*\d+\s*\n\s*(\d+\.)/g, "\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
