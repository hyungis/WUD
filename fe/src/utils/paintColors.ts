export const PAINT_PRESET_COLORS = [
  "#000000",
  "#8C8C8C",
  "#A40011",
  "#ED1C24",
  "#F58220",
  "#FFE600",
] as const;

const RECENT_COLORS_KEY = "recentPaintColors";
const MAX_RECENT_COLORS = 10;

function normalizeHexColor(color: string): string {
  const trimmed = color.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return "#000000";
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
  }
  return trimmed.toUpperCase();
}

export function getRecentPaintColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === "string")
      .map(normalizeHexColor)
      .slice(0, MAX_RECENT_COLORS);
  } catch {
    return [];
  }
}

export function addRecentPaintColor(color: string, current: string[]): string[] {
  const normalized = normalizeHexColor(color);
  const deduped = [normalized, ...current.filter((item) => normalizeHexColor(item) !== normalized)];
  return deduped.slice(0, MAX_RECENT_COLORS);
}

export function saveRecentPaintColors(colors: string[]): void {
  try {
    const normalized = colors.map(normalizeHexColor).slice(0, MAX_RECENT_COLORS);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(normalized));
  } catch {
    // no-op for private mode / storage failures
  }
}
