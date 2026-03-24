import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { DailyPlanet, DeepStar } from "../../utils/homeHelpers";
import { getWeekKey, formatDate, formatDateTimeKST } from "../../utils/homeHelpers";
import { useAuthStore } from "../../../../store/authStore";
import { useCustomStarStore, STAR_SHAPES, STAR_COLORS } from "../../../../store/customStarStore";
import { userApi } from "../../../../api/user";
import { logout } from "../../../../services/auth";
import type { UserProfileResponse } from "../../../../types/user";

type TabKey = "overview" | "daily" | "deep" | "customize" | "profile";

interface MyUniverseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mypageStar: { id: string; toneColor: string; label: string; createdAt: string };
  dailyPlanets: DailyPlanet[];
  deepStars: DeepStar[];
  onDeepStarClick: (star: DeepStar) => void;
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
const IconBack = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M15 18l-6-6 6-6" /></svg>
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
}: MyUniverseModalProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedItem, setSelectedItem] = useState<{ type: "daily"; data: DailyPlanet } | null>(null);

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
      setSelectedItem(null);
      setEditingNickname(false);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setPasswordMsg(null);
      setWithdrawConfirm(false);
      void fetchProfile();
      void fetchCenterStar();
    }
  }, [isOpen, fetchProfile, fetchCenterStar]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedItem) setSelectedItem(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, selectedItem]);

  if (!isOpen) return null;

  const totalRecords = dailyPlanets.length + deepStars.length;
  const uniqueWeeks = new Set([
    ...dailyPlanets.map((p) => getWeekKey(new Date(p.createdAt))),
    ...deepStars.map((s) => s.weekKey || getWeekKey(new Date(s.createdAt))),
  ]).size;

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

  const switchTab = (key: TabKey) => { setTab(key); setSelectedItem(null); };

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

              {/* 나의 감정 톤 */}
              <div className={cardCls}>
                <p className={labelCls}>나의 감정 톤</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex-shrink-0 shadow-lg"
                    style={{ backgroundColor: displayToneColor, boxShadow: `0 0 24px ${displayToneColor}44` }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white font-mono">{displayToneColor}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">중심별 색상</p>
                  </div>
                </div>
              </div>

              {/* 최근 활동 */}
              {totalRecords > 0 && (
                <div className={cardCls}>
                  <p className={labelCls}>최근 활동</p>
                  <div className="space-y-1">
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
                              ? setSelectedItem({ type: "daily", data: item.raw as DailyPlanet })
                              : onDeepStarClick(item.raw as any)
                          }
                          className="w-full flex items-center gap-3 rounded-xl hover:bg-white/[0.04] px-3 py-2.5 -mx-1 transition-colors text-left group"
                        >
                          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="flex-1 text-[13px] text-zinc-300 truncate group-hover:text-white transition-colors">{item.label}</span>
                          <span className="text-[10px] text-zinc-600 flex-shrink-0">{formatDate(item.date)}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 ${item.type === "deep" ? "bg-violet-500/15 text-violet-400" : "bg-sky-500/15 text-sky-400"
                            }`}>
                            {item.type === "deep" ? "WEEKLY" : "DAILY"}
                          </span>
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
            <div className="space-y-2">
              {dailyPlanets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.06] p-10 text-center">
                  <div className="text-3xl mb-3 opacity-30">◇</div>
                  <p className="text-zinc-400 text-sm">DAILY PLANET이 없어요</p>
                </div>
              ) : (
                [...dailyPlanets]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((planet, i) => (
                    <button
                      key={planet.id || i}
                      onClick={() => setSelectedItem({ type: "daily", data: planet })}
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
                          {planet.memo ? planet.memo.slice(0, 40) + (planet.memo.length > 40 ? "…" : "") : "DAILY PLANET"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-600">{formatDate(planet.createdAt)}</span>
                          {planet.objectType && <span className="text-[10px] px-1.5 py-px rounded bg-sky-500/10 text-sky-400/80">{planet.objectType}</span>}
                        </div>
                      </div>
                      <IconChevron className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
                    </button>
                  ))
              )}
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

      {/* ━━━ 상세 리포트 오버레이 ━━━ */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedItem(null); }}
        >
          <div className="relative mx-3 flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0a0a0f]/95 shadow-[0_32px_64px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            <div className="relative px-6 pt-5 pb-4 flex-shrink-0">
              <div
                className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-32 w-32 rounded-full blur-[60px] opacity-25"
                style={{ backgroundColor: selectedItem.type === "daily" ? selectedItem.data.shell : (selectedItem.data as any).toneColor }}
              />
              <div className="flex items-center gap-3 relative z-10">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-shrink-0 h-8 w-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                  aria-label="뒤로"
                >
                  <IconBack />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    {selectedItem.type === "daily" ? "DAILY REPORT" : "WEEKLY REPORT"}
                  </p>
                  <h3 className="text-sm font-semibold text-white truncate mt-0.5">
                    {selectedItem.type === "daily"
                      ? selectedItem.data.memo?.slice(0, 30) || "DAILY PLANET"
                      : (selectedItem.data as any).label || "WEEKLY STAR"}
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">{formatDate(selectedItem.data.createdAt)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-4">
              {selectedItem.type === "daily" &&
                (() => {
                  const p = selectedItem.data;
                  return (
                    <>
                      <div className="flex justify-center py-5">
                        <div className="relative flex items-center justify-center">
                          <div
                            className="h-20 w-20 rotate-45 rounded-lg"
                            style={{
                              background: `linear-gradient(135deg, ${p.shell}, ${p.core || p.shell}88)`,
                              boxShadow: `0 0 40px ${p.shell}55, 0 0 80px ${p.shell}22`,
                            }}
                          />
                          <div className="absolute h-5 w-5 rotate-45 rounded-sm opacity-50" style={{ backgroundColor: "#ffffff", top: "20%", left: "24%" }} />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className={cardCls}>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Shell</p>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-md flex-shrink-0" style={{ backgroundColor: p.shell }} />
                            <span className="text-xs text-zinc-300 font-mono">{p.shell}</span>
                          </div>
                        </div>
                        {p.core && (
                          <div className={cardCls}>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Core</p>
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-md flex-shrink-0" style={{ backgroundColor: p.core }} />
                              <span className="text-xs text-zinc-300 font-mono">{p.core}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {p.memo && (
                        <div className={cardCls}>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">오늘의 한 줄</p>
                          <p className="text-sm text-zinc-200 leading-relaxed italic">"{p.memo}"</p>
                        </div>
                      )}

                      {p.objectType && (
                        <div className={cardCls}>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">오브젝트</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-sky-500/10 text-sky-400">{p.objectType}</span>
                            {p.objectColor && <div className="h-4 w-4 rounded-full" style={{ backgroundColor: p.objectColor }} />}
                          </div>
                        </div>
                      )}

                      <div className={cardCls}>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">기록 일시</p>
                        <p className="text-sm text-zinc-300">{formatDateTimeKST(p.createdAt)}</p>
                      </div>
                    </>
                  );
                })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
