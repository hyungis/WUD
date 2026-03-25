import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { DailyPlanet, DeepStar } from "../../utils/homeHelpers";
import { getWeekKey, formatDate } from "../../utils/homeHelpers";
import { useAuthStore } from "../../../../store/authStore";
import { useCustomStarStore, STAR_SHAPES, STAR_COLORS } from "../../../../store/customStarStore";
import { userApi } from "../../../../api/user";
import { dailyApi } from "../../../../api/daily";
import { logout } from "../../../../services/auth";
import type { UserProfileResponse } from "../../../../types/user";
import type { DailyListItemResponse } from "../../../../types/daily";
import { getApiErrorMessage } from "../../../../utils/apiError";

type TabKey = "overview" | "daily" | "deep" | "customize" | "profile";
type EmotionRatioItem = { color: string; label: string; count: number; ratio: number };
type DailyRangePreset = "DAY" | "WEEK" | "MONTH" | "ALL";

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

const DAILY_FETCH_COOLDOWN_MS = 30000;
const DAILY_CACHE_TTL_MS = 5 * 60 * 1000;
const DAILY_INITIAL_VISIBLE = 24;
const DAILY_INCREMENT_VISIBLE = 24;

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
        <p className={labelCls}>색상 선택</p>
        <div className="grid grid-cols-4 gap-3">
          {STAR_COLORS.map((c) => {
            const isActive = currentColor === c.hex;
            return (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className="group flex flex-col items-center gap-2"
              >
                <div className="relative">
                  <div
                    className={`h-10 w-10 rounded-full transition-all duration-200 ${isActive
                      ? "ring-2 ring-white/60 ring-offset-2 ring-offset-[#0a0a0f] scale-110"
                      : "hover:scale-105"
                      }`}
                    style={{
                      backgroundColor: c.hex,
                      boxShadow: isActive ? `0 0 20px ${c.hex}66` : `0 0 8px ${c.hex}22`,
                    }}
                  />
                  {isActive && (
                    <svg className="absolute inset-0 m-auto h-4 w-4 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-[10px] transition-colors ${isActive ? "text-white font-medium" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                  {c.label}
                </span>
              </button>
            );
          })}
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
                {STAR_SHAPES.find((s) => s.key === currentShape)?.label} · {STAR_COLORS.find((c) => c.hex === currentColor)?.label}
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
  const [dailyLastSyncedAt, setDailyLastSyncedAt] = useState<number | null>(null);
  const [dailyFullVisibleCount, setDailyFullVisibleCount] = useState(DAILY_INITIAL_VISIBLE);
  const [dailyCategoryVisibleCount, setDailyCategoryVisibleCount] = useState(12);
  const emotionCardRef = useRef<HTMLDivElement | null>(null);

  const buildDailyCacheKey = (preset: DailyRangePreset, date: string) =>
    `my-universe-daily-cache:${user?.email || "anon"}:${preset}:${date}`;

  const buildDailyListParams = (preset: DailyRangePreset, date: string) => {
    if (preset === "ALL") return undefined;
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
      setWithdrawConfirm(false);
      setDailyFilterEmotion(null);
      setDailyApiItems([]);
      setDailyApiError(null);
      setDailyApiLoaded(false);
      setDailyFetchBlockedUntil(0);
      setDailyRangePreset("WEEK");
      setDailySelectedDate(getTodayKstDate());
      setDailyLastSyncedAt(null);
      setDailyFullVisibleCount(DAILY_INITIAL_VISIBLE);
      setDailyCategoryVisibleCount(12);
      void fetchProfile();
      void fetchCenterStar();
    }
  }, [isOpen, fetchProfile, fetchCenterStar]);

  useEffect(() => {
    setDailyFullVisibleCount(DAILY_INITIAL_VISIBLE);
  }, [dailyRangePreset, dailySelectedDate]);

  useEffect(() => {
    setDailyCategoryVisibleCount(12);
  }, [dailyFilterEmotion, dailyRangePreset, dailySelectedDate]);

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
    acc[colorKey] = (acc[colorKey] || 0) + 1;
    return acc;
  }, {});

  const totalEmotionCount = Object.values(emotionRatioSource).reduce((sum, count) => sum + count, 0);
  const emotionRatioItems: EmotionRatioItem[] = Object.entries(emotionRatioSource)
    .map(([color, count]) => ({
      color,
      label: emotionFromColor(color),
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

  const fetchDailyByApi = async (force = false, preset = dailyRangePreset, date = dailySelectedDate) => {
    if (dailyApiLoading) return;
    const now = Date.now();
    if (!force && dailyFetchBlockedUntil > now) return;
    const safeDate = toDateOrNull(date) ? date : getTodayKstDate();

    const dailyCacheKey = buildDailyCacheKey(preset, safeDate);

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
      const res = await dailyApi.getDailyList(buildDailyListParams(preset, safeDate));
      const nextItems = res.data || [];
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
    setDailyFilterEmotion(emotionLabel);
    if (!dailyApiLoading && dailyApiItems.length === 0) {
      void fetchDailyByApi();
    }
  };

  useEffect(() => {
    if (tab !== "daily") return;
    void fetchDailyByApi();
  }, [tab, dailyRangePreset, dailySelectedDate]);

  if (!isOpen) return null;

  const handleEmotionHoverMove = (emotion: EmotionRatioItem, e: React.MouseEvent<HTMLElement | SVGPathElement>) => {
    const cardRect = emotionCardRef.current?.getBoundingClientRect();
    if (!cardRect) return;
    setHoverPopup({
      emotion,
      x: e.clientX - cardRect.left + 12,
      y: e.clientY - cardRect.top + 12,
    });
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

  const dailyApiSorted = [...dailyApiItems].sort((a, b) => {
    return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
  });

  const localDailySorted = [...dailyPlanets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isWithinDailyRange = (rawDate?: string | null) => {
    const date = toDateOrNull(rawDate || undefined);
    if (!date) return false;

    if (dailyRangePreset === "ALL") return true;

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

  const dailyApiFiltered = dailyFilterEmotion
    ? dailyApiRanged.filter((item) => getBackendEmotionLabel(item) === dailyFilterEmotion)
    : [];

  const localDailyFiltered = dailyFilterEmotion
    ? localDailyRanged.filter((planet) => emotionFromColor((planet.shell || "").toUpperCase()) === dailyFilterEmotion)
    : [];

  const dailyApiVisibleBase = dailyFilterEmotion
    ? dailyApiRanged.filter((item) => getBackendEmotionLabel(item) === dailyFilterEmotion)
    : dailyApiRanged;

  const localDailyVisibleBase = dailyFilterEmotion
    ? localDailyRanged.filter((planet) => emotionFromColor((planet.shell || "").toUpperCase()) === dailyFilterEmotion)
    : localDailyRanged;

  const fullDailyListCount = dailyApiRanged.length > 0 ? dailyApiVisibleBase.length : localDailyVisibleBase.length;
  const backendFullVisible = dailyApiVisibleBase.slice(0, dailyFullVisibleCount);
  const localFullVisible = localDailyVisibleBase.slice(0, dailyFullVisibleCount);

  const backendCategoryVisible = dailyApiFiltered.slice(0, dailyCategoryVisibleCount);
  const localCategoryVisible = localDailyFiltered.slice(0, dailyCategoryVisibleCount);

  const retryWaitSeconds = Math.max(0, Math.ceil((dailyFetchBlockedUntil - Date.now()) / 1000));

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
            {/* 아바타 */}
            <div className="relative flex-shrink-0">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${displayToneColor}88, ${displayToneColor}33)` }}
              >
                {displayName.slice(0, 1)}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0f]"
                style={{ backgroundColor: displayToneColor }}
              />
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
                {t.key !== "overview" && t.key !== "profile" && (
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
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-6 custom-scrollbar">

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
                          {donutSlices.map((slice) => (
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
                            />
                          ))}
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

                {hoverPopup && (
                  <div
                    className="absolute z-[70] w-[320px] rounded-xl border border-white/[0.14] bg-[#0c0c12] shadow-[0_12px_28px_rgba(0,0,0,0.45)] overflow-hidden pointer-events-none"
                    style={{ left: hoverPopup.x, top: hoverPopup.y }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.08] bg-white/[0.02]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hoverPopup.emotion.color }} />
                      <span className="text-[11px] text-zinc-200 font-medium">{hoverPopup.emotion.label}</span>
                      <span className="text-[10px] text-zinc-500">{hoverPopup.emotion.count}회 · {hoverPopup.emotion.ratio.toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-500 border-b border-white/[0.08] bg-white/[0.02]">
                      <span>기록</span>
                      <span>날짜</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                      {getEmotionRecordsByLabel(hoverPopup.emotion.label).slice(0, 4).map((planet, i) => (
                        <div key={planet.id || i} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 border-b border-white/[0.04] last:border-b-0">
                          <span className="text-[11px] text-zinc-300 truncate">{planet.memo || "DAILY PLANET"}</span>
                          <span className="text-[10px] text-zinc-500">{formatDate(planet.createdAt)}</span>
                        </div>
                      ))}
                      {getEmotionRecordsByLabel(hoverPopup.emotion.label).length === 0 && (
                        <div className="px-3 py-3 text-[11px] text-zinc-500">기록이 없습니다.</div>
                      )}
                    </div>
                  </div>
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
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[11px] text-zinc-300">
                  {dailyLastSyncedAt && (
                    <span className="text-[10px] text-zinc-500">최근 동기화 {formatDate(new Date(dailyLastSyncedAt).toISOString())}</span>
                  )}
                  {!dailyApiLoading && (
                    <button
                      type="button"
                      onClick={() => void fetchDailyByApi(true)}
                      className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.1] hover:text-zinc-200"
                      aria-label="새로고침"
                      title="새로고침"
                    >
                      <IconRefresh className="h-3.5 w-3.5" />
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
                      disabled={dailyRangePreset === "ALL"}
                      className="bg-transparent text-[12px] text-zinc-100 outline-none disabled:opacity-40"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "DAY" as const, label: "1일" },
                      { key: "WEEK" as const, label: "1주" },
                      { key: "MONTH" as const, label: "1개월" },
                      { key: "ALL" as const, label: "전체" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setDailyRangePreset(option.key)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${dailyRangePreset === option.key
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/[0.1] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]"
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="mb-3 text-[10px] text-zinc-500">기준 날짜를 중심으로 선택한 기간 안의 기록을 보여줍니다.</p>

                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-300">감정 분류 리스트</p>
                  {dailyFilterEmotion && (
                    <button
                      type="button"
                      onClick={() => setDailyFilterEmotion(null)}
                      className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/[0.06] transition"
                    >
                      필터 해제
                    </button>
                  )}
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDailyFilterEmotion(null)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${dailyFilterEmotion === null
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-white/[0.1] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]"
                      }`}
                  >
                    전체 {hasBackendDailyData ? dailyApiRanged.length : localDailyRanged.length}
                  </button>

                  {emotionFilterOptions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setDailyFilterEmotion(option.label)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${dailyFilterEmotion === option.label
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

                {dailyFilterEmotion ? (
                  hasBackendDailyData ? (
                    dailyApiFiltered.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-center">
                        <p className="text-sm text-zinc-400">해당 감정의 데일리 기록이 없어요</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {backendCategoryVisible.map((item) => (
                          <div key={item.dailyId} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                            <p className="text-[13px] text-zinc-200">{item.resultSummary || "감정 분석 결과가 아직 없습니다."}</p>
                            <div className="mt-1 flex items-center gap-2">
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
                          </div>
                        ))}
                        {dailyApiFiltered.length > dailyCategoryVisibleCount && (
                          <button
                            type="button"
                            onClick={() => setDailyCategoryVisibleCount((prev) => prev + 12)}
                            className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] py-2 text-[11px] text-zinc-300 hover:bg-white/[0.08] transition"
                          >
                            분류 결과 더보기 ({dailyApiFiltered.length - dailyCategoryVisibleCount})
                          </button>
                        )}
                      </div>
                    )
                  ) : localDailyFiltered.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-center">
                      <p className="text-sm text-zinc-400">해당 감정의 데일리 기록이 없어요</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {localCategoryVisible.map((planet, i) => (
                        <div key={planet.id || i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-[13px] text-zinc-200">{planet.memo || "DAILY 기록"}</p>
                          <div className="mt-1 flex items-center gap-2">
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
                      ))}
                      {localDailyFiltered.length > dailyCategoryVisibleCount && (
                        <button
                          type="button"
                          onClick={() => setDailyCategoryVisibleCount((prev) => prev + 12)}
                          className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] py-2 text-[11px] text-zinc-300 hover:bg-white/[0.08] transition"
                        >
                          분류 결과 더보기 ({localDailyFiltered.length - dailyCategoryVisibleCount})
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-[11px] text-zinc-500">감정을 선택하면 분류된 기록을 볼 수 있습니다.</p>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-300">기록 리스트 ({fullDailyListCount})</p>
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
                      <div key={item.dailyId} className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-[13px] text-zinc-200 truncate">{item.resultSummary || "DAILY 기록"}</p>
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
                      </div>
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
                            {planet.memo ? planet.memo.slice(0, 40) + (planet.memo.length > 40 ? "..." : "") : "DAILY PLANET"}
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
            <div className="space-y-2">
              {deepStars.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.06] p-10 text-center">
                  <div className="text-3xl mb-3 opacity-30">✧</div>
                  <p className="text-zinc-400 text-sm">WEEKLY 기록이 없어요</p>
                  <p className="text-zinc-600 text-xs mt-1">WEEKLY 검사를 통해 WEEKLY STAR를 만들어보세요</p>
                </div>
              ) : (
                [...deepStars]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((star, i) => (
                    <button
                      key={star.id || i}
                      onClick={() => onDeepStarClick(star as any)}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] p-4 flex items-center gap-4 transition-all text-left group"
                    >
                      <div
                        className="flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: star.toneColor + "18", border: `1px solid ${star.toneColor}30` }}
                      >
                        <div className="h-3.5 w-3.5 rotate-45 rounded-[3px]" style={{ backgroundColor: star.toneColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-zinc-200 group-hover:text-white transition-colors">{star.label || "WEEKLY STAR"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-600">{formatDate(star.createdAt)}</span>
                          {star.weekKey && <span className="text-[10px] px-1.5 py-px rounded bg-violet-500/10 text-violet-400/80">{star.weekKey}</span>}
                        </div>
                      </div>
                      <IconChevron className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
                    </button>
                  ))
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
                  {/* 프로필 카드 */}
                  <div className={cardCls}>
                    <div className="flex items-start gap-4">
                      <div
                        className="h-14 w-14 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${displayToneColor}66, ${displayToneColor}22)` }}
                      >
                        {displayName.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {editingNickname ? (
                            <div className="flex items-center gap-2">
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
                              <p className="text-base font-semibold text-white">{profile?.nickname || displayName}</p>
                              <button
                                onClick={() => { setNicknameInput(profile?.nickname || displayName); setEditingNickname(true); }}
                                className="text-zinc-600 hover:text-zinc-300 transition"
                              >
                                <IconEdit />
                              </button>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{profile?.email || user?.email || "-"}</p>
                        <div className="flex gap-4 mt-3 text-[10px] text-zinc-600">
                          <span>가입 {profile?.joinedAt ? formatDate(profile.joinedAt) : "-"}</span>
                          <span>마지막 접속 {profile?.lastLoginAt ? formatDate(profile.lastLoginAt) : "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 비밀번호 변경 */}
                  <div className={cardCls}>
                    <p className={labelCls}>비밀번호 변경</p>
                    <div className="space-y-2.5">
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
                  </div>

                  {/* 계정 관리 */}
                  <div className={cardCls}>
                    <p className={labelCls}>계정 관리</p>
                    <div className="space-y-2">
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] py-2.5 text-sm text-zinc-300 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <IconLogout className="h-3.5 w-3.5" />
                        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                      </button>
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
                </>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
