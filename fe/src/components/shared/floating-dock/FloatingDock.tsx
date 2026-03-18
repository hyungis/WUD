import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore, selectHasDeepStarThisWeek } from "../../../store/uiStore";
import { logout } from "../../../services/auth";

export default function FloatingDock() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const isDockHidden = useUiStore((state) => state.isDockHidden);
    const isOverlayOpen = useUiStore((state) => state.isOverlayOpen);
    const setDailyContentModalOpen = useUiStore((state) => state.setDailyContentModalOpen);
    const setDailyDetailModalOpen = useUiStore((state) => state.setDailyDetailModalOpen);
    const setWeeklyContentModalOpen = useUiStore((state) => state.setWeeklyContentModalOpen);
    const setWeeklyHtpModalOpen = useUiStore((state) => state.setWeeklyHtpModalOpen);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isCheckingWeekly, setIsCheckingWeekly] = useState(false);
    const glassButtonClass = "inline-flex h-8 sm:h-9 lg:h-10 items-center justify-center rounded-[12px] border border-white/22 bg-white/14 px-2.5 sm:px-3 lg:px-4 text-[11px] sm:text-xs lg:text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/24 hover:border-white/45 hover:backdrop-blur-xl hover:shadow-[0_8px_24px_rgba(148,163,184,0.26),inset_0_1px_0_rgba(255,255,255,0.58)]";

    const displayName = user?.nickname || user?.name || user?.email?.split("@")[0] || "사용자";

    const handleLogout = async () => {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);
        try {
            await logout();
            setIsProfileModalOpen(false);
            navigate("/");
        } finally {
            setIsLoggingOut(false);
        }
    };

    const hasWeeklyStar = useUiStore(selectHasDeepStarThisWeek);

    const handleWeeklyClick = async () => {
        if (isCheckingWeekly) {
            return;
        }

        setIsCheckingWeekly(true);
        try {
            if (hasWeeklyStar) {
                window.alert("이번 주 위클리 별은 이미 생성되었어요. 다음 주에 새 별이 생성됩니다.");
                return;
            }

            setWeeklyHtpModalOpen(false);
            setWeeklyContentModalOpen(true);
        } catch {
            // 네트워크 확인 실패 시에는 기존 흐름을 유지해 기능 차단을 피한다.
            setWeeklyHtpModalOpen(false);
            setWeeklyContentModalOpen(true);
        } finally {
            setIsCheckingWeekly(false);
        }
    };

    return (
        <>
            <div
                className={`fixed bottom-3 sm:bottom-4 lg:bottom-6 left-1/2 z-50 flex w-[min(calc(100vw-0.75rem),44rem)] sm:w-[min(calc(100vw-1rem),48rem)] lg:w-auto -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 sm:gap-2 lg:gap-3 px-1 transition-all duration-700 ${isDockHidden
                    || isOverlayOpen
                    ? "translate-y-[150%] opacity-0 pointer-events-none"
                    : "translate-y-0 opacity-100 pointer-events-auto"
                    }`}
            >
                {/* 1. 주요 액션 (위클리, 데일리) */}
                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
                    <button
                        onClick={handleWeeklyClick}
                        disabled={isCheckingWeekly}
                        className={`${glassButtonClass} min-w-[64px] sm:min-w-[76px] lg:min-w-[90px]`}
                    >
                        {isCheckingWeekly ? "CHECKING..." : "WEEKLY"}
                    </button>
                    <button
                        onClick={() => {
                            setDailyDetailModalOpen(false);
                            setDailyContentModalOpen(true);
                        }}
                        className={`${glassButtonClass} min-w-[64px] sm:min-w-[76px] lg:min-w-[90px]`}
                    >
                        DAILY
                    </button>
                </div>

                {/* 2. 사용자 프로필 */}
                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={() => setIsProfileModalOpen(true)}
                        className="inline-flex h-8 sm:h-9 lg:h-10 max-w-[44vw] sm:max-w-[40vw] lg:max-w-none items-center gap-1.5 sm:gap-2 rounded-[12px] border border-white/22 bg-white/14 px-2.5 sm:px-3 lg:px-4 text-[11px] sm:text-xs lg:text-sm font-semibold text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/24 hover:border-white/45 hover:backdrop-blur-xl hover:shadow-[0_8px_24px_rgba(148,163,184,0.26),inset_0_1px_0_rgba(255,255,255,0.58)]"
                    >
                        <span className="flex h-5.5 w-5.5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold">
                            {displayName.slice(0, 1)}
                        </span>
<<<<<<< HEAD
                        <div className="leading-tight hidden sm:block">
                            <p className="text-xs font-semibold text-slate-100">{displayName}</p>
                            <p className="text-[10px] text-slate-400">MY PAGE</p>
                        </div>
=======
                        <span className="hidden lg:inline max-w-[8rem] truncate text-sm font-semibold text-slate-100">{displayName}</span>
                        <span className="text-[10px] sm:text-[11px] lg:text-xs font-semibold tracking-wide text-slate-300">MYPAGE</span>
>>>>>>> 31a56db (FEAT : merge home floating timeline responsive updates)
                    </button>
                </div>
            </div>

            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4" onClick={() => setIsProfileModalOpen(false)}>
                    <div
                        className="w-full max-w-sm rounded-[12px] border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold text-white">프로필</h2>
                        <p className="mt-1 text-sm text-slate-300">{displayName}</p>
                        <p className="mt-1 text-xs text-slate-400">{user?.email || "이메일을 불러오는 중"}</p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsProfileModalOpen(false);
                                    navigate("/mypage");
                                }}
                                className="rounded-[12px] border border-white/35 bg-white/14 px-4 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md hover:bg-white/20 transition"
                            >
                                마이페이지
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsProfileModalOpen(false)}
                                className="rounded-[12px] border border-white/35 bg-white/14 px-4 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md hover:bg-white/20 transition"
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="rounded-[12px] border border-white/35 bg-white/14 px-4 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md hover:bg-white/20 transition disabled:opacity-60"
                            >
                                {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
