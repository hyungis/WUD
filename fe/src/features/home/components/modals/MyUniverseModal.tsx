import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { DailyPlanet, DeepStar } from "../../utils/homeHelpers";
import { getWeekKey, formatDate } from "../../utils/homeHelpers";
import { useAuthStore } from "../../../../store/authStore";
import SmallStarView from "../../../../components/shared/SmallStarView";
import { useCustomStarStore, STAR_SHAPES, STAR_COLORS } from "../../../../store/customStarStore";
import { userApi } from "../../../../api/user";
import { dailyApi } from "../../../../api/daily";
import { logout } from "../../../../services/auth";
import type { UserProfileResponse } from "../../../../types/user";
import type { DailyListItemResponse } from "../../../../types/daily";
import { getApiErrorMessage } from "../../../../utils/apiError";

type TabKey = "overview" | "daily" | "deep" | "customize" | "profile";
type EmotionRatioItem = { color: string; label: string; count: number; ratio: number };
type DailyRangePreset = "DAY" | "WEEK" | "MONTH" | "CUSTOM" | "ALL";
type WeeklyRangePreset = "WEEK" | "MONTH" | "THREE_MONTH" | "ALL";

const EMOTION_COLOR_PALETTE = [
  { label: "기쁨", color: "#FFD54F" },
  { label: "평온", color: "#4FC3F7" },
  { label: "설렘", color: "#FF6FAE" },
  { label: "만족", color: "#66BB6A" },
  { label: "슬픔", color: "#5C6BC0" },
  { label: "불안", color: "#9575CD" },
  { label: "분노", color: "#EF5350" },
  { label: "지침", color: "#90A4AE" },
] as const;

const COLOR_TO_EMOTION: Record<string, string> = Object.fromEntries(
  EMOTION_COLOR_PALETTE.map((item) => [item.color, item.label]),
);

const EMOTION_TO_COLOR: Record<string, string> = Object.fromEntries(
  EMOTION_COLOR_PALETTE.map((item) => [item.label, item.color]),
);

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
};

const colorDistance = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
};

const emotionFromColor = (hex: string) => {
  const normalized = hex.toUpperCase();
  if (COLOR_TO_EMOTION[normalized]) return COLOR_TO_EMOTION[normalized];

  const inputRgb = hexToRgb(normalized);
  if (!inputRgb) return "기타";

  let bestLabel = "기타";
  let minDistance = Number.POSITIVE_INFINITY;

  EMOTION_COLOR_PALETTE.forEach((item) => {
    const targetRgb = hexToRgb(item.color);
    if (!targetRgb) return;
    const distance = colorDistance(inputRgb, targetRgb);
    if (distance < minDistance) {
      minDistance = distance;
      bestLabel = item.label;
    }
  });

  return bestLabel;
};

const emotionLabelToColor = (label: string) => {
  return EMOTION_TO_COLOR[label] || "#71717A";
};

const weekSortValue = (weekKey: string) => {
  const match = weekKey.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return 0;
  return Number.parseInt(match[1], 10) * 100 + Number.parseInt(match[2], 10);
};

const formatWeekKeyLabel = (weekKey: string) => {
  const match = weekKey.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return weekKey;
  return `${match[1]}년 ${Number.parseInt(match[2], 10)}주차`;
};

const DAILY_FETCH_COOLDOWN_MS = 30000;
const DAILY_CACHE_TTL_MS = 5 * 60 * 1000;
const DAILY_INITIAL_VISIBLE = 24;
const DAILY_INCREMENT_VISIBLE = 24;
const DAILY_CUSTOM_MAX_MONTHS = 3;

/** HSL -> HEX 변환 헬퍼 */
const hslToHex = (h: number, s: number, l: number) => {
  const lightness = l / 100;
  const a = (s * Math.min(lightness, 1 - lightness)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toLowerCase();
};

const PALETTE_HUES = [0, 30, 60, 120, 180, 210, 250, 280, 320, 345];
const PALETTE_LIGHTNESS = [35, 50, 65, 80];

type DailyCachePayload = {
  fetchedAt: number;
  items: DailyListItemResponse[];
};

const getTodayKstDate = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
};

const normalizeCustomMonthRange = (startDate: string, endDate: string, maxMonths: number) => {
  const fallback = getTodayKstDate();
  const startRaw = toDateOrNull(startDate) ?? new Date(`${fallback}T00:00:00`);
  const endRaw = toDateOrNull(endDate) ?? new Date(`${fallback}T00:00:00`);

  const start = new Date(startRaw);
  const end = new Date(endRaw);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > end) {
    start.setTime(end.getTime());
  }

  const inclusiveMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  if (inclusiveMonths > maxMonths) {
    start.setFullYear(end.getFullYear(), end.getMonth() - (maxMonths - 1), 1);
    start.setHours(0, 0, 0, 0);
  }

  const format = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return { start: format(start), end: format(end) };
};

const getMonthlyAnchorDates = (startDate: string, endDate: string, maxMonths: number) => {
  const normalized = normalizeCustomMonthRange(startDate, endDate, maxMonths);
  const start = new Date(`${normalized.start}T00:00:00`);
  const end = new Date(`${normalized.end}T00:00:00`);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);
  const anchors: string[] = [];

  while (cursor <= limit && anchors.length < maxMonths) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    anchors.push(`${y}-${m}-01`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return anchors;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toDateOrNull = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

interface MyUniverseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mypageStar: { id: string; toneColor: string; label: string; createdAt: string };
  dailyPlanets: DailyPlanet[];
  deepStars: DeepStar[];
  onDeepStarClick: (star: DeepStar) => void;
  onDailyPlanetClick: (planet: DailyPlanet) => void;
}

/* ── 아이콘 SVG 컴포넌트 ── */
const IconGrid = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const IconStar = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
  </svg>
);
const IconPlanet = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <circle cx="12" cy="12" r="8" /><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-30 12 12)" />
  </svg>
);
const IconUser = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <circle cx="12" cy="8" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
  </svg>
);
const IconChevron = ({ className = "h-3 w-3" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M9 18l6-6-6-6" /></svg>
);
const IconClose = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const IconEdit = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M16.474 5.408l2.118 2.118m-.756-3.982L12.109 9.27a2.118 2.118 0 0 0-.58 1.082L11 13l2.648-.53a2.118 2.118 0 0 0 1.082-.58l5.727-5.727a1.853 1.853 0 1 0-2.621-2.621z" />
    <path d="M19 15v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3" />
  </svg>
);
const IconLogout = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
  </svg>
);
const IconCustomize = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
  </svg>
);
const IconRefresh = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);
const IconChevronDown = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/* ── 커스터마이징 탭 내용 ── */
function CustomizeTabContent({ cardCls, labelCls }: { cardCls: string; labelCls: string }) {
  const { currentShape, currentColor, setShape, setColor, saveToBackend } = useCustomStarStore();
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await saveToBackend();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("서버 저장 실패:", e);
    }
  };

  return (
    <div className="space-y-4">
      {/* 모양 선택 */}
      <div className={cardCls}>
        <p className={labelCls}>모양 선택</p>
        <div className="grid grid-cols-4 gap-2">
          {STAR_SHAPES.map((s) => {
            const isActive = currentShape === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setShape(s.key)}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-200 ${isActive
                  ? "border-white/30 bg-white/[0.08] shadow-[0_0_16px_rgba(255,255,255,0.08)]"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]"
                  }`}
              >
                <span className={`text-xl transition-transform duration-200 ${isActive ? "scale-125" : ""}`}>
                  {s.icon}
                </span>
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? "text-white" : "text-zinc-500"}`}>
                  {s.label}
                </span>
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 색상 선택 */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-4">
          <p className={labelCls}>색상 선택</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.08] shadow-sm tracking-wider">
              {currentColor.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* 가로 스펙트럼 그리드 */}
          <div className="grid grid-cols-10 gap-1.5 p-1 bg-black/20 rounded-xl border border-white/[0.05]">
            {PALETTE_HUES.map((h) => (
              <div key={h} className="flex flex-col gap-1.5">
                {PALETTE_LIGHTNESS.map((l) => {
                  const hex = hslToHex(h, 85, l);
                  const isActive = currentColor.toLowerCase() === hex;
                  return (
                    <motion.button
                      key={hex}
                      whileHover={{ scale: 1.15, zIndex: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setColor(hex)}
                      className={`relative w-full aspect-square rounded-md transition-shadow duration-300 ${isActive ? "ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] z-10" : ""
                        }`}
                      style={{
                        backgroundColor: hex,
                        boxShadow: isActive ? `0 0 15px ${hex}88` : "none",
                      }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-dot"
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <label className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group">
              <div className="relative shrink-0">
                <div
                  className="h-10 w-10 rounded-full border border-white/10"
                  style={{ backgroundColor: currentColor }}
                />
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white mb-0.5 group-hover:text-amber-200 transition-colors">기타 색상 선택</p>
                <p className="text-[9px] text-zinc-500 truncate">더 세밀한 색상 조절이 필요하신가요?</p>
              </div>
            </label>

            <div className="flex-[0.6] flex items-center gap-2 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-[10px] text-zinc-500 font-mono">HEX</div>
              <input
                type="text"
                value={currentColor.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-F]{0,6}$/i.test(val)) {
                    setColor(val);
                  }
                }}
                className="w-full bg-transparent border-none outline-none text-[11px] font-mono text-white p-0"
                placeholder="#FFFFFF"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 현재 선택 미리보기 + 저장 */}
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg"
              style={{
                backgroundColor: currentColor,
                boxShadow: `0 0 16px ${currentColor}44`,
              }}
            />
            <div>
              <p className="text-xs text-white font-medium">
                {STAR_SHAPES.find((s) => s.key === currentShape)?.label} · {STAR_COLORS.find((c) => c.hex.toLowerCase() === currentColor.toLowerCase())?.label || "나만의 색상"}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">변경사항은 저장 후 유지됩니다</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition-all duration-300 ${saved
              ? "bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
              : "bg-white/[0.08] border border-white/[0.1] text-white hover:bg-white/[0.14] hover:border-white/[0.2]"
              }`}
          >
            {saved ? "✓ 저장됨" : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MyUniverseModal({
  isOpen,
  onClose,
  mypageStar,
  dailyPlanets,
  deepStars,
  onDeepStarClick,
  onDailyPlanetClick,
}: MyUniverseModalProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<TabKey>("overview");

  const { currentColor, fetchCenterStar } = useCustomStarStore();
  const displayToneColor = currentColor || mypageStar.toneColor;

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hoverPopup, setHoverPopup] = useState<{ emotion: EmotionRatioItem; x: number; y: number } | null>(null);
  const [dailyFilterEmotion, setDailyFilterEmotion] = useState<string | null>(null);
  const [dailyApiItems, setDailyApiItems] = useState<DailyListItemResponse[]>([]);
  const [dailyApiLoading, setDailyApiLoading] = useState(false);
  const [dailyApiError, setDailyApiError] = useState<string | null>(null);
  const [dailyApiLoaded, setDailyApiLoaded] = useState(false);
  const [dailyFetchBlockedUntil, setDailyFetchBlockedUntil] = useState(0);
  const [dailyRangePreset, setDailyRangePreset] = useState<DailyRangePreset>("WEEK");
  const [dailySelectedDate, setDailySelectedDate] = useState(() => getTodayKstDate());
  const [dailyCustomStartDate, setDailyCustomStartDate] = useState(() => getTodayKstDate());
  const [dailyCustomEndDate, setDailyCustomEndDate] = useState(() => getTodayKstDate());
  const [dailyLastSyncedAt, setDailyLastSyncedAt] = useState<number | null>(null);
  const [dailyFullVisibleCount, setDailyFullVisibleCount] = useState(DAILY_INITIAL_VISIBLE);
  const [deepRangePreset, setDeepRangePreset] = useState<WeeklyRangePreset>("MONTH");
  const [deepSelectedDate, setDeepSelectedDate] = useState(() => getTodayKstDate());
  const emotionCardRef = useRef<HTMLDivElement | null>(null);

  const buildDailyCacheKey = (preset: DailyRangePreset, date: string, customStart?: string, customEnd?: string) =>
    `my-universe-daily-cache:${user?.email || "anon"}:${preset}:${date}:${customStart || ""}:${customEnd || ""}`;

  const buildDailyListParams = (preset: DailyRangePreset, date: string) => {
    if (preset === "ALL" || preset === "CUSTOM") return undefined;
    return { period: preset, date } as { period: "DAY" | "WEEK" | "MONTH"; date: string };
  };

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await userApi.getProfile();
      if (res.success && res.data) setProfile(res.data);
    } catch { /* ignore */ } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTab("overview");
      setEditingNickname(false);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setPasswordMsg(null);
      setPasswordOpen(false);
      setWithdrawConfirm(false);
      setDailyFilterEmotion(null);
      setDailyApiItems([]);
      setDailyApiError(null);
      setDailyApiLoaded(false);
      setDailyFetchBlockedUntil(0);
      setDailyRangePreset("WEEK");
      setDailySelectedDate(getTodayKstDate());
      setDailyCustomStartDate(getTodayKstDate());
      setDailyCustomEndDate(getTodayKstDate());
      setDailyLastSyncedAt(null);
      setDailyFullVisibleCount(DAILY_INITIAL_VISIBLE);
      setDeepRangePreset("MONTH");
      setDeepSelectedDate(getTodayKstDate());
      void fetchProfile();
      void fetchCenterStar();
    }
  }, [isOpen, fetchProfile, fetchCenterStar]);

  useEffect(() => {
    setDailyFullVisibleCount(DAILY_INITIAL_VISIBLE);
  }, [dailyRangePreset, dailySelectedDate, dailyCustomStartDate, dailyCustomEndDate]);

  useEffect(() => {
    if (dailyRangePreset !== "CUSTOM") return;
    const normalized = normalizeCustomMonthRange(dailyCustomStartDate, dailyCustomEndDate, DAILY_CUSTOM_MAX_MONTHS);
    if (normalized.start !== dailyCustomStartDate) setDailyCustomStartDate(normalized.start);
    if (normalized.end !== dailyCustomEndDate) setDailyCustomEndDate(normalized.end);
  }, [dailyRangePreset, dailyCustomStartDate, dailyCustomEndDate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalRecords = dailyPlanets.length + deepStars.length;
  const uniqueWeeks = new Set([
    ...dailyPlanets.map((p) => getWeekKey(new Date(p.createdAt))),
    ...deepStars.map((s) => s.weekKey).filter((key): key is string => Boolean(key)),
  ]).size;

  const emotionRatioSource = dailyPlanets.reduce<Record<string, number>>((acc, planet) => {
    const colorKey = (planet.shell || "").toUpperCase();
    if (!colorKey) return acc;
    const label = emotionFromColor(colorKey);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const totalEmotionCount = Object.values(emotionRatioSource).reduce((sum, count) => sum + count, 0);
  const emotionRatioItems: EmotionRatioItem[] = Object.entries(emotionRatioSource)
    .map(([label, count]) => ({
      color: emotionLabelToColor(label),
      label,
      count,
      ratio: (count / Math.max(totalEmotionCount, 1)) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  const donutSize = 184;
  const donutRadius = 72;
  const donutStroke = 28;
  const donutCenter = donutSize / 2;
  const donutSlices = (() => {
    let accRatio = 0;
    return emotionRatioItems.map((item) => {
      const startRatio = accRatio;
      const endRatio = accRatio + item.ratio;
      accRatio = endRatio;
      const startAngle = (startRatio / 100) * 360;
      const endAngle = (endRatio / 100) * 360;
      return {
        ...item,
        d: describeArc(donutCenter, donutCenter, donutRadius, startAngle, endAngle),
      };
    });
  })();

  const getEmotionRecordsByLabel = (label: string) => {
    return [...dailyPlanets]
      .filter((planet) => emotionFromColor((planet.shell || "").toUpperCase()) === label)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const fetchDailyByApi = async (
    force = false,
    preset = dailyRangePreset,
    date = dailySelectedDate,
    customStart = dailyCustomStartDate,
    customEnd = dailyCustomEndDate,
  ) => {
    if (dailyApiLoading) return;
    const now = Date.now();
    if (!force && dailyFetchBlockedUntil > now) return;
    const safeDate = toDateOrNull(date) ? date : getTodayKstDate();

    const normalizedCustomRange = normalizeCustomMonthRange(customStart, customEnd, DAILY_CUSTOM_MAX_MONTHS);
    const dailyCacheKey = buildDailyCacheKey(preset, safeDate, normalizedCustomRange.start, normalizedCustomRange.end);

    if (!force) {
      try {
        const raw = sessionStorage.getItem(dailyCacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as DailyCachePayload;
          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            setDailyApiItems(parsed.items);
            setDailyApiLoaded(true);
            setDailyLastSyncedAt(parsed.fetchedAt || null);
            if (now - (parsed.fetchedAt || 0) < DAILY_CACHE_TTL_MS) {
              setDailyApiError(null);
              return;
            }
          }
        }
      } catch {
        // ignore cache parse errors
      }
    }

    setDailyApiLoading(true);
    setDailyApiError(null);
    try {
      let nextItems: DailyListItemResponse[] = [];
      if (preset === "CUSTOM") {
        const monthlyDates = getMonthlyAnchorDates(normalizedCustomRange.start, normalizedCustomRange.end, DAILY_CUSTOM_MAX_MONTHS);
        const monthlyResponses = await Promise.all(
          monthlyDates.map((monthDate) => dailyApi.getDailyList({ period: "MONTH", date: monthDate })),
        );
        const dedup = new Map<string, DailyListItemResponse>();
        monthlyResponses.forEach((res) => {
          (res.data || []).forEach((item) => {
            const key = item.dailyId ? String(item.dailyId) : `${item.entryDate}:${item.resultSummary || ""}`;
            dedup.set(key, item);
          });
        });
        nextItems = Array.from(dedup.values());
      } else {
        const res = await dailyApi.getDailyList(buildDailyListParams(preset, safeDate));
        nextItems = res.data || [];
      }
      setDailyApiItems(nextItems);
      setDailyApiLoaded(true);
      setDailyLastSyncedAt(Date.now());
      try {
        const payload: DailyCachePayload = { fetchedAt: Date.now(), items: nextItems };
        sessionStorage.setItem(dailyCacheKey, JSON.stringify(payload));
      } catch {
        // ignore cache write errors
      }
      setDailyFetchBlockedUntil(0);
    } catch (error) {
      setDailyApiError(getApiErrorMessage(error, "데일리 기록을 불러오지 못했습니다."));
      setDailyFetchBlockedUntil(Date.now() + DAILY_FETCH_COOLDOWN_MS);
    } finally {
      setDailyApiLoading(false);
    }
  };

  const openDailyTabByEmotion = (emotionLabel: string) => {
    setTab("daily");
    setDailyRangePreset("ALL");
    setDailyFilterEmotion(emotionLabel);
    if (!dailyApiLoading && dailyApiItems.length === 0) {
      void fetchDailyByApi(false, "ALL", dailySelectedDate, dailyCustomStartDate, dailyCustomEndDate);
    }
  };

  useEffect(() => {
    if (tab !== "daily") return;
    void fetchDailyByApi();
  }, [tab, dailyRangePreset, dailySelectedDate, dailyCustomStartDate, dailyCustomEndDate]);

  if (!isOpen) return null;

  const handleEmotionHoverMove = (emotion: EmotionRatioItem, e: React.MouseEvent<HTMLElement | SVGPathElement>) => {
    const TOOLTIP_WIDTH = 320;
    const TOOLTIP_HEIGHT = 230;
    const PADDING = 12;

    let nextX = e.clientX + 14;
    let nextY = e.clientY + 14;

    if (nextX + TOOLTIP_WIDTH > window.innerWidth - PADDING) {
      nextX = Math.max(PADDING, e.clientX - TOOLTIP_WIDTH - 14);
    }
    if (nextY + TOOLTIP_HEIGHT > window.innerHeight - PADDING) {
      nextY = Math.max(PADDING, window.innerHeight - TOOLTIP_HEIGHT - PADDING);
    }

    nextX = Math.max(PADDING, Math.min(nextX, window.innerWidth - TOOLTIP_WIDTH - PADDING));
    nextY = Math.max(PADDING, Math.min(nextY, window.innerHeight - TOOLTIP_HEIGHT - PADDING));

    setHoverPopup({ emotion, x: nextX, y: nextY });
  };

  const displayName = user?.nickname || user?.name || user?.email?.split("@")[0] || "사용자";

  const handleNicknameSave = async () => {
    if (!nicknameInput.trim()) return;
    setNicknameSaving(true);
    try {
      await userApi.updateProfile({ nickname: nicknameInput.trim() });
      useAuthStore.getState().setUser({ ...user, nickname: nicknameInput.trim(), name: nicknameInput.trim() });
      setEditingNickname(false);
      await fetchProfile();
    } catch { /* ignore */ } finally {
      setNicknameSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMsg(null);
    if (!passwordForm.next || passwordForm.next.length < 8) {
      setPasswordMsg({ ok: false, text: "비밀번호는 8자 이상이어야 합니다." });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMsg({ ok: false, text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    setPasswordSaving(true);
    try {
      await userApi.changePassword({ currentPassword: passwordForm.current || undefined, newPassword: passwordForm.next });
      setPasswordMsg({ ok: true, text: "비밀번호가 변경되었습니다." });
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch {
      setPasswordMsg({ ok: false, text: "비밀번호 변경에 실패했습니다." });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      await userApi.withdraw();
      useAuthStore.getState().clearAuth();
      onClose();
      navigate("/");
    } catch { /* ignore */ }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
      navigate("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "OVERVIEW", icon: <IconGrid /> },
    { key: "daily", label: "DAILY", icon: <IconPlanet /> },
    { key: "deep", label: "WEEKLY", icon: <IconStar /> },
    { key: "customize", label: "CUSTOMIZE", icon: <IconCustomize /> },
    { key: "profile", label: "PROFILE", icon: <IconUser /> },
  ];

  const switchTab = (key: TabKey) => {
    setTab(key);
    if (key !== "daily") {
      setDailyFilterEmotion(null);
    }
  };

  const getBackendEmotionLabel = (item: DailyListItemResponse) => {
    if (item.emotion && item.emotion.trim().length > 0) return item.emotion;
    return emotionFromColor((item.emotionColor || "").toUpperCase());
  };

  const formatDailySummaryText = (raw: unknown) => {
    if (typeof raw !== "string") return "";
    const text = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    if (!text) return "";

    const extractFromObject = (obj: unknown): string => {
      if (!obj || typeof obj !== "object") return "";
      const source = obj as Record<string, unknown>;
      const candidate = source.analysis || source.resultSummary || source.result || source.summary || "";
      if (typeof candidate === "string") return candidate.trim();
      if (candidate && typeof candidate === "object") {
        const nested: string = extractFromObject(candidate);
        if (nested) return nested;
      }
      return "";
    };

    const tryParseText = (value: string): string => {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "string") {
          if (parsed.trim() === value.trim()) return "";
          return tryParseText(parsed.trim()) || parsed.trim();
        }
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const fromArrayItem = typeof item === "string"
              ? tryParseText(item) || item.trim()
              : extractFromObject(item);
            if (fromArrayItem) return fromArrayItem;
          }
          return "";
        }
        return extractFromObject(parsed);
      } catch {
        return "";
      }
    };

    const parsedDirect = tryParseText(text);
    if (parsedDirect) return parsedDirect;

    // 문자열 내부에 JSON이 섞여있는 경우를 대비
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const embedded = text.slice(firstBrace, lastBrace + 1);
      const parsedEmbedded = tryParseText(embedded);
      if (parsedEmbedded) return parsedEmbedded;
    }

    const analysisMatch = text.match(/"analysis"\s*:\s*"([\s\S]*?)"/i);
    if (analysisMatch?.[1]) {
      const unescaped = analysisMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, "\"")
        .trim();
      if (unescaped) return unescaped;
    }

    return text;
  };

  const toDailyPlanetFromApi = (item: DailyListItemResponse): DailyPlanet => {
    const emotionColor = (item.emotionColor || emotionLabelToColor(getBackendEmotionLabel(item)) || "#71717A").toUpperCase();
    return {
      id: String(item.dailyId || `${item.entryDate}-${item.resultSummary || "daily"}`),
      shell: emotionColor,
      core: emotionColor,
      memo: formatDailySummaryText(item.resultSummary) || "DAILY 기록",
      createdAt: item.entryDate,
    } as DailyPlanet;
  };

  const dailyApiSorted = [...dailyApiItems].sort((a, b) => {
    return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
  });

  const localDailySorted = [...dailyPlanets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isWithinDailyRange = (rawDate?: string | null) => {
    const date = toDateOrNull(rawDate || undefined);
    if (!date) return false;

    if (dailyRangePreset === "ALL") return true;

    if (dailyRangePreset === "CUSTOM") {
      const normalized = normalizeCustomMonthRange(dailyCustomStartDate, dailyCustomEndDate, DAILY_CUSTOM_MAX_MONTHS);
      const target = startOfDay(date);
      const rangeStart = startOfDay(new Date(`${normalized.start}T00:00:00`));
      const rangeEnd = startOfDay(new Date(`${normalized.end}T00:00:00`));
      return target >= rangeStart && target <= rangeEnd;
    }

    const target = startOfDay(date);
    const anchor = startOfDay(new Date(`${dailySelectedDate}T00:00:00`));

    if (dailyRangePreset === "DAY") {
      return target.getTime() === anchor.getTime();
    }

    if (dailyRangePreset === "WEEK") {
      const weekStart = new Date(anchor);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return target >= weekStart && target <= weekEnd;
    }

    return target.getFullYear() === anchor.getFullYear() && target.getMonth() === anchor.getMonth();
  };

  const dailyApiRanged = dailyApiSorted.filter((item) => isWithinDailyRange(item.entryDate));
  const localDailyRanged = localDailySorted.filter((planet) => isWithinDailyRange(planet.createdAt));

  const dailyApiEmotionSummary = dailyApiRanged.reduce<Record<string, number>>((acc, item) => {
    const label = getBackendEmotionLabel(item);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const localDailyEmotionSummary = localDailyRanged.reduce<Record<string, number>>((acc, planet) => {
    const label = emotionFromColor((planet.shell || "").toUpperCase());
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const hasBackendDailyData = dailyApiLoaded;

  const effectiveEmotionSummary = hasBackendDailyData
    ? dailyApiEmotionSummary
    : localDailyEmotionSummary;

  const emotionFilterOptions = [
    ...EMOTION_COLOR_PALETTE.map((item) => ({
      label: item.label,
      color: item.color,
      count: effectiveEmotionSummary[item.label] || 0,
    })),
    ...Object.keys(effectiveEmotionSummary)
      .filter((label) => !EMOTION_TO_COLOR[label])
      .sort((a, b) => (effectiveEmotionSummary[b] || 0) - (effectiveEmotionSummary[a] || 0))
      .map((label) => ({
        label,
        color: emotionLabelToColor(label),
        count: effectiveEmotionSummary[label] || 0,
      })),
  ];

  const dailyApiVisibleBase = dailyFilterEmotion
    ? dailyApiRanged.filter((item) => getBackendEmotionLabel(item) === dailyFilterEmotion)
    : dailyApiRanged;

  const localDailyVisibleBase = dailyFilterEmotion
    ? localDailyRanged.filter((planet) => emotionFromColor((planet.shell || "").toUpperCase()) === dailyFilterEmotion)
    : localDailyRanged;

  const fullDailyListCount = dailyApiRanged.length > 0 ? dailyApiVisibleBase.length : localDailyVisibleBase.length;
  const backendFullVisible = dailyApiVisibleBase.slice(0, dailyFullVisibleCount);
  const localFullVisible = localDailyVisibleBase.slice(0, dailyFullVisibleCount);

  const retryWaitSeconds = Math.max(0, Math.ceil((dailyFetchBlockedUntil - Date.now()) / 1000));

  const deepSorted = [...deepStars].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isWithinDeepRange = (rawDate: string) => {
    const target = startOfDay(new Date(rawDate));
    const anchor = startOfDay(new Date(`${deepSelectedDate}T00:00:00`));
    if (deepRangePreset === "ALL") return true;
    if (deepRangePreset === "WEEK") {
      const weekStart = new Date(anchor);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return target >= weekStart && target <= weekEnd;
    }
    if (deepRangePreset === "MONTH") {
      return target.getFullYear() === anchor.getFullYear() && target.getMonth() === anchor.getMonth();
    }
    const rangeStart = new Date(anchor);
    rangeStart.setMonth(rangeStart.getMonth() - 2);
    return target >= rangeStart && target <= anchor;
  };

  const deepRanged = deepSorted.filter((star) => isWithinDeepRange(star.createdAt));
  const deepKeywordFiltered = deepRanged;

  const deepGroupedEntries = Object.entries(
    deepKeywordFiltered.reduce<Record<string, DeepStar[]>>((acc, star) => {
      const key = star.weekKey || getWeekKey(new Date(star.createdAt));
      if (!acc[key]) acc[key] = [];
      acc[key].push(star);
      return acc;
    }, {}),
  ).sort((a, b) => weekSortValue(b[0]) - weekSortValue(a[0]));

  // 공통 카드 스타일
  const cardCls = "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm";
  const labelCls = "text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3";

  return (
    <div
      className="fixed inset-0 z-50 flex pointer-events-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 좌측 투명 영역 (별이 보임) */}
      <div className="flex-1" onClick={onClose} />

      {/* 우측 슬라이드인 패널 */}
      <div
        className="relative flex h-full w-full max-w-[800px] flex-col overflow-hidden border-l border-white/[0.08] bg-[#0a0a0f]/90 shadow-[−32px_0_64px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-[slideInRight_0.35s_ease-out]"
        style={{ animation: "slideInRight 0.35s ease-out" }}
      >

        {/* ━━━ 헤더 ━━━ */}
        <div className="relative flex-shrink-0 px-6 pt-5 pb-0">
          {/* 배경 글로우 */}
          <div
            className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-[80px] opacity-15"
            style={{ backgroundColor: displayToneColor }}
          />

          <div className="flex items-center gap-4 relative z-10 mb-5">
            {/* 아바타 (커스텀 별) */}
            <div className="relative flex-shrink-0 h-14 w-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
              <SmallStarView />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-white truncate leading-tight">{displayName}의 우주</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {totalRecords}개 기록 · {uniqueWeeks}주 · {profile?.email || user?.email || ""}
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 h-8 w-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-zinc-500 hover:text-white transition-all"
              aria-label="닫기"
            >
              <IconClose />
            </button>
          </div>

          {/* ━━━ 탭 ━━━ */}
          <div className="flex border-b border-white/[0.06]">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={`group relative flex items-center gap-1.5 px-4 pb-3 pt-1 text-xs font-medium transition-all ${tab === t.key
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
                  }`}
              >
                <span className={tab === t.key ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"}>{t.icon}</span>
                <span>{t.label}</span>
                {(t.key === "daily" || t.key === "deep") && (
                  <span className={`text-[9px] px-1 py-px rounded ${tab === t.key ? "bg-white/10 text-zinc-300" : "bg-white/[0.04] text-zinc-600"}`}>
                    {t.key === "daily" ? dailyPlanets.length : deepStars.length}
                  </span>
                )}
                {tab === t.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-white/80" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ━━━ 탭 콘텐츠 ━━━ */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-5 pb-20 custom-scrollbar">

          {/* ── 개요 ── */}
          {tab === "overview" && (
            <div className="space-y-4">
              {/* 통계 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "전체", value: totalRecords, color: displayToneColor },
                  { label: "DAILY", value: dailyPlanets.length, color: "#38bdf8" },
                  { label: "WEEKLY", value: deepStars.length, color: "#a78bfa" },
                ].map((s) => (
                  <div key={s.label} className={`${cardCls} text-center`}>
                    <p className="text-3xl font-bold text-white tracking-tight">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wider mt-1 flex items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-zinc-500">{s.label}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* 선택 감정 비율 */}
              <div className={`${cardCls} relative overflow-visible z-30`} ref={emotionCardRef}>
                <p className={labelCls}>선택 감정 비율</p>
                {emotionRatioItems.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:divide-x md:divide-white/[0.08]">
                    <div className="flex items-center justify-center min-h-[220px] md:pr-6">
                      <div className="relative" style={{ width: donutSize, height: donutSize }}>
                        <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} className="overflow-visible">
                          <circle
                            cx={donutCenter}
                            cy={donutCenter}
                            r={donutRadius}
                            fill="none"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth={donutStroke}
                          />
                          {donutSlices.length === 1 ? (
                            <circle
                              cx={donutCenter}
                              cy={donutCenter}
                              r={donutRadius}
                              fill="none"
                              stroke={donutSlices[0].color}
                              strokeWidth={donutStroke}
                              className="cursor-pointer transition-opacity hover:opacity-80"
                              onClick={() => openDailyTabByEmotion(donutSlices[0].label)}
                              onMouseEnter={(e) => handleEmotionHoverMove(donutSlices[0], e)}
                              onMouseMove={(e) => handleEmotionHoverMove(donutSlices[0], e)}
                              onMouseLeave={() => setHoverPopup(null)}
                            >
                              <title>{`${donutSlices[0].label} · ${donutSlices[0].count}회 (${donutSlices[0].ratio.toFixed(1)}%)`}</title>
                            </circle>
                          ) : (
                            donutSlices.map((slice) => (
                              <path
                                key={slice.color}
                                d={slice.d}
                                fill="none"
                                stroke={slice.color}
                                strokeWidth={donutStroke}
                                strokeLinecap="butt"
                                className="cursor-pointer transition-opacity hover:opacity-80"
                                onClick={() => openDailyTabByEmotion(slice.label)}
                                onMouseEnter={(e) => handleEmotionHoverMove(slice, e)}
                                onMouseMove={(e) => handleEmotionHoverMove(slice, e)}
                                onMouseLeave={() => setHoverPopup(null)}
                              >
                                <title>{`${slice.label} · ${slice.count}회 (${slice.ratio.toFixed(1)}%)`}</title>
                              </path>
                            ))
                          )}
                        </svg>
                        <div className="pointer-events-none absolute inset-0 m-auto h-24 w-24 rounded-full bg-[#0a0a0f] border border-white/[0.08] flex flex-col items-center justify-center">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Daily</p>
                          <p className="text-2xl font-bold text-white leading-none">{totalEmotionCount}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 md:pl-6">
                      {emotionRatioItems.map((item) => (
                        <button
                          key={item.color}
                          onClick={() => openDailyTabByEmotion(item.label)}
                          onMouseEnter={(e) => handleEmotionHoverMove(item, e)}
                          onMouseMove={(e) => handleEmotionHoverMove(item, e)}
                          onMouseLeave={() => setHoverPopup(null)}
                          title={`${item.label} · ${item.count}회 (${item.ratio.toFixed(1)}%)`}
                          className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors text-left ${hoverPopup?.emotion.label === item.label ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                            }`}
                        >
                          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="flex-1 text-[12px] text-zinc-300">{item.label}</span>
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-[11px] text-zinc-500 tabular-nums">{item.count}회</span>
                            <span className="text-[12px] font-semibold text-white tabular-nums min-w-[42px] text-right">
                              {item.ratio.toFixed(1)}%
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-center">
                    <p className="text-sm text-zinc-400">감정 비율을 계산할 DAILY 기록이 아직 없어요</p>
                  </div>
                )}

                {hoverPopup && typeof document !== "undefined" && createPortal(
                  <div
                    className="fixed z-[220] w-[280px] rounded-xl border border-white/[0.14] bg-[#0c0c12] shadow-[0_12px_28px_rgba(0,0,0,0.45)] overflow-hidden pointer-events-none"
                    style={{ left: hoverPopup.x, top: hoverPopup.y }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.08] bg-white/[0.02]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hoverPopup.emotion.color }} />
                      <span className="text-[11px] text-zinc-200 font-medium">{hoverPopup.emotion.label}</span>
                      <span className="text-[10px] text-zinc-500">{hoverPopup.emotion.count}회 · {hoverPopup.emotion.ratio.toFixed(1)}%</span>
                    </div>
                    <div className="px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">비율</span>
                        <span className="text-zinc-200 font-medium">{hoverPopup.emotion.ratio.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">기록 수</span>
                        <span className="text-zinc-200 font-medium">{hoverPopup.emotion.count}회</span>
                      </div>
                      <div className="pt-1 border-t border-white/[0.08] text-[10px] text-zinc-400 truncate">
                        최근 기록: {(() => {
                          const latest = getEmotionRecordsByLabel(hoverPopup.emotion.label)[0];
                          if (!latest) return "없음";
                          const summary = formatDailySummaryText(latest.memo) || "DAILY PLANET";
                          return `${summary} · ${formatDate(latest.createdAt)}`;
                        })()}
                      </div>
                    </div>
                  </div>,
                  document.body,
                )}
              </div>

              {/* 최근 활동 */}
              {totalRecords > 0 && (
                <div className={`${cardCls} relative z-0`}>
                  <p className={labelCls}>최근 활동</p>
                  <div className="space-y-1.5">
                    {[
                      ...dailyPlanets.map((p) => ({ type: "daily" as const, id: p.id, color: p.shell, label: p.memo || "DAILY PLANET", date: p.createdAt, raw: p })),
                      ...deepStars.map((s) => ({ type: "deep" as const, id: s.id, color: s.toneColor, label: s.label || "WEEKLY 기록", date: s.createdAt, raw: s })),
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((item, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            item.type === "daily"
                              ? onDailyPlanetClick(item.raw as DailyPlanet)
                              : onDeepStarClick(item.raw as any)
                          }
                          className="w-full flex items-center gap-2.5 rounded-xl hover:bg-white/[0.04] px-3 py-2.5 -mx-1 transition-colors text-left group"
                        >
                          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-zinc-300 truncate group-hover:text-white transition-colors">{item.label}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-600">{formatDate(item.date)}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${item.type === "deep" ? "bg-violet-500/15 text-violet-400" : "bg-sky-500/15 text-sky-400"
                                }`}>
                                {item.type === "deep" ? "WEEKLY" : "DAILY"}
                              </span>
                            </div>
                          </div>
                          <IconChevron className="h-3 w-3 text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {totalRecords === 0 && (
                <div className="rounded-2xl border border-dashed border-white/[0.06] p-10 text-center">
                  <div className="text-3xl mb-3 opacity-30">✦</div>
                  <p className="text-zinc-400 text-sm">아직 기록이 없어요</p>
                  <p className="text-zinc-600 text-xs mt-1">DAILY 또는 WEEKLY 기록을 시작해보세요</p>
                </div>
              )}
            </div>
          )}

          {/* ── 데일리 ── */}
          {tab === "daily" && (
            <div className="space-y-4">
              {dailyApiLoading && dailyApiItems.length === 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
                  <p className="text-sm text-zinc-400">백엔드 데일리 기록 불러오는 중...</p>
                </div>
              )}

              {dailyApiError && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] p-4 text-center">
                  <p className="text-sm text-amber-300">{dailyApiError}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">전체 리스트는 모달 데이터로 계속 표시합니다.</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => void fetchDailyByApi(true)}
                      disabled={dailyApiLoading || retryWaitSeconds > 0}
                      className="rounded-md border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-[11px] text-zinc-200 transition hover:bg-white/[0.1] disabled:opacity-50"
                    >
                      {retryWaitSeconds > 0 ? `재시도 대기 ${retryWaitSeconds}초` : "백엔드 다시 불러오기"}
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2 px-1 py-1 text-[11px] text-zinc-300">
                  {dailyLastSyncedAt && (
                    <span className="text-[10px] text-zinc-500">최근 업데이트 {formatDate(new Date(dailyLastSyncedAt).toISOString())}</span>
                  )}
                  {!dailyApiLoading && (
                    <button
                      type="button"
                      onClick={() => void fetchDailyByApi(true)}
                      className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.1] hover:text-zinc-200"
                      aria-label="새로고침"
                      title="새로고침"
                    >
                      <IconRefresh className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[auto_1fr] md:items-center">
                  <label className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.02] px-3 py-2">
                    <span className="text-[11px] text-zinc-400">기준 날짜</span>
                    <input
                      type="date"
                      value={dailySelectedDate}
                      onChange={(e) => setDailySelectedDate(e.target.value || getTodayKstDate())}
                      disabled={dailyRangePreset === "ALL" || dailyRangePreset === "CUSTOM"}
                      className="bg-transparent text-[12px] text-zinc-100 outline-none disabled:opacity-40"
                    />
                  </label>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {[
                      { key: "DAY" as const, label: "1일" },
                      { key: "WEEK" as const, label: "1주" },
                      { key: "MONTH" as const, label: "1개월" },
                      { key: "CUSTOM" as const, label: "직접 설정" },
                      { key: "ALL" as const, label: "전체" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setDailyRangePreset(option.key)}
                        className={`w-full rounded-full border px-3 py-1.5 text-center text-[12px] whitespace-nowrap transition ${dailyRangePreset === option.key
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/[0.1] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]"
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {dailyRangePreset === "CUSTOM" ? (
                  <div className="mb-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.02] px-3 py-2">
                        <span className="text-[10px] text-zinc-400">시작</span>
                        <input
                          type="date"
                          value={dailyCustomStartDate}
                          onChange={(e) => setDailyCustomStartDate(e.target.value || getTodayKstDate())}
                          className="bg-transparent text-[12px] text-zinc-100 outline-none"
                        />
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.02] px-3 py-2">
                        <span className="text-[10px] text-zinc-400">종료</span>
                        <input
                          type="date"
                          value={dailyCustomEndDate}
                          onChange={(e) => setDailyCustomEndDate(e.target.value || getTodayKstDate())}
                          className="bg-transparent text-[12px] text-zinc-100 outline-none"
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-500">원활한 사용을 위해 직접 설정은 최근 {DAILY_CUSTOM_MAX_MONTHS}개월까지 살펴볼 수 있어요.</p>
                  </div>
                ) : (
                  <p className="mb-3 text-[10px] text-zinc-500">기준 날짜를 중심으로 선택한 기간 안의 기록을 보여줍니다.</p>
                )}

                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setDailyFilterEmotion(null)}
                    className={`rounded-full border px-3 py-1 text-[11px] transition ${dailyFilterEmotion === null
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-white/[0.1] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]"
                      }`}
                  >
                    전체 {hasBackendDailyData ? dailyApiRanged.length : localDailyRanged.length}
                  </button>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  {emotionFilterOptions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setDailyFilterEmotion(option.label)}
                      className={`rounded-full border px-3 py-1 text-[11px] transition ${dailyFilterEmotion === option.label
                        ? "border-white/30 bg-white/10 text-white"
                        : option.count === 0
                          ? "border-white/[0.06] bg-white/[0.02] text-zinc-500"
                          : "border-white/[0.1] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]"
                        }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: option.color }} />
                        <span>{option.label}</span>
                        <span className="text-zinc-500">{option.count}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-zinc-500">
                  {dailyFilterEmotion
                    ? `${dailyFilterEmotion} 감정 필터가 적용되었습니다. 아래 기록 리스트에서 확인할 수 있어요.`
                    : "원하는 감정을 고르면 아래 기록 리스트가 해당 감정으로 정리됩니다."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-300">전체 기록 ({fullDailyListCount})</p>
                  {dailyFilterEmotion && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: emotionLabelToColor(dailyFilterEmotion) }} />
                      <span>{dailyFilterEmotion}</span>
                    </span>
                  )}
                </div>

                {dailyApiRanged.length > 0 ? (
                  <div className="space-y-2">
                    {backendFullVisible.map((item) => (
                      <button
                        type="button"
                        key={item.dailyId}
                        onClick={() => onDailyPlanetClick(toDailyPlanetFromApi(item))}
                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition hover:bg-white/[0.05] hover:border-white/[0.1]"
                      >
                        <p className="text-[13px] text-zinc-200 truncate">{formatDailySummaryText(item.resultSummary) || "DAILY 기록"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-600">{formatDate(item.entryDate)}</span>
                          <span className="text-[10px] px-1.5 py-px rounded bg-sky-500/10 text-sky-400/80">{item.dailyType}</span>
                          <span className="inline-flex items-center gap-1.5 text-[10px] px-1.5 py-px rounded bg-white/10 text-zinc-300">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: item.emotionColor || emotionLabelToColor(getBackendEmotionLabel(item)) }}
                            />
                            <span>{getBackendEmotionLabel(item)}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                    {fullDailyListCount > dailyFullVisibleCount && (
                      <button
                        type="button"
                        onClick={() => setDailyFullVisibleCount((prev) => prev + DAILY_INCREMENT_VISIBLE)}
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] py-2 text-[11px] text-zinc-300 hover:bg-white/[0.08] transition"
                      >
                        전체 리스트 더보기 ({fullDailyListCount - dailyFullVisibleCount})
                      </button>
                    )}
                  </div>
                ) : localDailyRanged.length > 0 ? (
                  <div className="space-y-2">
                    {localFullVisible.map((planet, i) => (
                      <button
                        key={planet.id || i}
                        onClick={() => onDailyPlanetClick(planet)}
                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] p-4 flex items-center gap-4 transition-all text-left group"
                      >
                        <div className="flex-shrink-0 h-9 w-9 flex items-center justify-center">
                          <div
                            className="h-6 w-6 rotate-45 rounded-[4px]"
                            style={{
                              background: `linear-gradient(135deg, ${planet.shell}, ${planet.core || planet.shell}88)`,
                              boxShadow: `0 0 12px ${planet.shell}44`,
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-zinc-200 truncate group-hover:text-white transition-colors">
                            {(() => {
                              const summaryText = formatDailySummaryText(planet.memo);
                              return summaryText ? summaryText.slice(0, 40) + (summaryText.length > 40 ? "..." : "") : "DAILY PLANET";
                            })()}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-600">{formatDate(planet.createdAt)}</span>
                            {planet.objectType && <span className="text-[10px] px-1.5 py-px rounded bg-sky-500/10 text-sky-400/80">{planet.objectType}</span>}
                            <span className="inline-flex items-center gap-1.5 text-[10px] px-1.5 py-px rounded bg-white/10 text-zinc-300">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: (planet.shell || "").toUpperCase() || emotionLabelToColor(emotionFromColor((planet.shell || "").toUpperCase())) }}
                              />
                              <span>{emotionFromColor((planet.shell || "").toUpperCase())}</span>
                            </span>
                          </div>
                        </div>
                        <IconChevron className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
                      </button>
                    ))}
                    {fullDailyListCount > dailyFullVisibleCount && (
                      <button
                        type="button"
                        onClick={() => setDailyFullVisibleCount((prev) => prev + DAILY_INCREMENT_VISIBLE)}
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] py-2 text-[11px] text-zinc-300 hover:bg-white/[0.08] transition"
                      >
                        전체 리스트 더보기 ({fullDailyListCount - dailyFullVisibleCount})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/[0.06] p-8 text-center">
                    <div className="text-3xl mb-3 opacity-30">◇</div>
                    <p className="text-zinc-400 text-sm">DAILY 기록이 없어요</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 심층 ── */}
          {tab === "deep" && (
            <div className="space-y-3">
              {deepStars.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.06] p-10 text-center">
                  <div className="text-3xl mb-3 opacity-30">✧</div>
                  <p className="text-zinc-400 text-sm">WEEKLY 기록이 없어요</p>
                  <p className="text-zinc-600 text-xs mt-1">WEEKLY 검사를 통해 WEEKLY STAR를 만들어보세요</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[auto_1fr] md:items-center">
                      <label className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.02] px-3 py-2">
                        <span className="text-[11px] text-zinc-400">기준 날짜</span>
                        <input
                          type="date"
                          value={deepSelectedDate}
                          onChange={(e) => setDeepSelectedDate(e.target.value || getTodayKstDate())}
                          disabled={deepRangePreset === "ALL"}
                          className="bg-transparent text-[12px] text-zinc-100 outline-none disabled:opacity-40"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { key: "WEEK" as const, label: "1주" },
                          { key: "MONTH" as const, label: "1개월" },
                          { key: "THREE_MONTH" as const, label: "3개월" },
                          { key: "ALL" as const, label: "전체" },
                        ].map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setDeepRangePreset(option.key)}
                            className={`w-full rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap transition ${deepRangePreset === option.key
                              ? "border-white/30 bg-white/10 text-white"
                              : "border-white/[0.1] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]"
                              }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {deepGroupedEntries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.06] p-8 text-center">
                      <p className="text-zinc-400 text-sm">선택한 조건의 WEEKLY 기록이 없어요</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deepGroupedEntries.map(([weekKey, stars]) => (
                        <section key={weekKey} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
                          <div className="mb-2 flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-1.5">
                            <p className="text-[11px] font-medium text-zinc-300">{formatWeekKeyLabel(weekKey)}</p>
                            <span className="text-[10px] text-zinc-500">{stars.length}개</span>
                          </div>
                          <div className="space-y-2">
                            {stars.map((star, i) => (
                              <button
                                key={star.id || i}
                                onClick={() => onDeepStarClick(star as any)}
                                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] p-3 flex items-center gap-3 transition-all text-left group"
                              >
                                <div
                                  className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: `${star.toneColor}18`, border: `1px solid ${star.toneColor}30` }}
                                >
                                  <div className="h-3 w-3 rotate-45 rounded-[3px]" style={{ backgroundColor: star.toneColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] text-zinc-200 group-hover:text-white transition-colors truncate">{star.label || "WEEKLY STAR"}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-zinc-600">{formatDate(star.createdAt)}</span>
                                    <span className="text-[10px] px-1.5 py-px rounded bg-white/10 text-zinc-300">{weekKey}</span>
                                  </div>
                                </div>
                                <IconChevron className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
                              </button>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── 커스터마이징 ── */}
          {tab === "customize" && <CustomizeTabContent cardCls={cardCls} labelCls={labelCls} />}

          {/* ── 프로필 ── */}
          {tab === "profile" && (
            <div className="space-y-4">
              {profileLoading ? (
                <div className={`${cardCls} py-10 text-center`}>
                  <div className="inline-block h-5 w-5 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
                  <p className="text-zinc-500 text-xs mt-3">불러오는 중...</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-4">
                      {/* 프로필 탭 내 로고 (커스텀 별) */}
                      <div className="relative flex-shrink-0 h-14 w-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                        <SmallStarView />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {editingNickname ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                value={nicknameInput}
                                onChange={(e) => setNicknameInput(e.target.value)}
                                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white outline-none focus:border-white/20 w-36"
                                autoFocus
                                maxLength={20}
                                onKeyDown={(e) => e.key === "Enter" && handleNicknameSave()}
                              />
                              <button onClick={handleNicknameSave} disabled={nicknameSaving} className="rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] text-white hover:bg-white/15 transition disabled:opacity-50">
                                {nicknameSaving ? "..." : "저장"}
                              </button>
                              <button onClick={() => setEditingNickname(false)} className="rounded-md bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-white/[0.08] transition">
                                취소
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="text-base font-semibold text-white truncate">{profile?.nickname || displayName}</p>
                              <button
                                onClick={() => { setNicknameInput(profile?.nickname || displayName); setEditingNickname(true); }}
                                className="text-zinc-600 hover:text-zinc-300 transition"
                              >
                                <IconEdit />
                              </button>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 truncate">{profile?.email || user?.email || "-"}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-600">
                          <span>가입 {profile?.joinedAt ? formatDate(profile.joinedAt) : "-"}</span>
                          <span>마지막 접속 {profile?.lastLoginAt ? formatDate(profile.lastLoginAt) : "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-white/[0.08] pt-4">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500">계정 관리</p>
                      <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setPasswordOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left"
                      >
                        <span className="text-sm text-zinc-200">비밀번호 변경</span>
                        <IconChevronDown className={`h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform ${passwordOpen ? "rotate-180" : ""}`} />
                      </button>

                      {passwordOpen && (
                        <div className="space-y-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          {[
                            { key: "current" as const, placeholder: "현재 비밀번호" },
                            { key: "next" as const, placeholder: "새 비밀번호 (8자 이상)" },
                            { key: "confirm" as const, placeholder: "새 비밀번호 확인" },
                          ].map((f) => (
                            <input
                              key={f.key}
                              type="password"
                              placeholder={f.placeholder}
                              value={passwordForm[f.key]}
                              onChange={(e) => setPasswordForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/15 transition-colors"
                            />
                          ))}
                          {passwordMsg && (
                            <p className={`text-xs ${passwordMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{passwordMsg.text}</p>
                          )}
                          <button
                            onClick={handlePasswordChange}
                            disabled={passwordSaving}
                            className="w-full rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] py-2.5 text-sm text-zinc-200 transition-all disabled:opacity-50"
                          >
                            {passwordSaving ? "변경 중..." : "비밀번호 변경"}
                          </button>
                        </div>
                      )}

                      {!withdrawConfirm ? (
                        <button
                          onClick={() => setWithdrawConfirm(true)}
                          className="w-full rounded-lg border border-red-500/10 bg-red-500/[0.04] py-2.5 text-sm text-red-400/80 hover:bg-red-500/[0.08] transition-all"
                        >
                          회원 탈퇴
                        </button>
                      ) : (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4">
                          <p className="text-xs text-red-300/80 mb-3">정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.</p>
                          <div className="flex gap-2">
                            <button onClick={handleWithdraw} className="flex-1 rounded-lg bg-red-500/20 border border-red-400/20 py-2 text-xs text-red-200 hover:bg-red-500/30 transition">
                              탈퇴 확인
                            </button>
                            <button onClick={() => setWithdrawConfirm(false)} className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] py-2 text-xs text-zinc-400 hover:bg-white/[0.08] transition">
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-[#0f1119]/85 px-4 py-2 text-xs text-zinc-200 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-sm transition hover:bg-white/[0.12] disabled:opacity-50"
          >
            <IconLogout className="h-3.5 w-3.5" />
            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      </div>

    </div>
  );
}
