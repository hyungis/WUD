import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore, selectHasDeepStarThisWeek } from "../../../store/uiStore";
import { logout } from "../../../services/auth";

export default function FloatingDock() {
    const location = useLocation();
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

    const displayName = user?.name || user?.email?.split("@")[0] || "사용자";

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
                className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-slate-950/70 px-6 py-3 shadow-2xl backdrop-blur-md transition-all duration-700 ${isDockHidden
                    || isOverlayOpen
                    ? "translate-y-[150%] opacity-0 pointer-events-none"
                    : "translate-y-0 opacity-100 pointer-events-auto"
                    }`}
            >
                {/* 1. 기본 네비게이션 (홈) */}
                <div className="flex items-center gap-6 pr-4 border-r border-white/10">
                    <Link
                        to="/"
                        className={`text-xs font-medium uppercase tracking-widest transition-colors ${location.pathname === "/" ? "text-white" : "text-slate-400 hover:text-white"}`}
                    >
                        Would You Draw
                    </Link>
                </div>

                {/* 2. 주요 액션 (데일리, 위클리) */}
                <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                    <button
                        onClick={() => {
                            setDailyDetailModalOpen(false);
                            setDailyContentModalOpen(true);
                        }}
                        className="liquid-btn liquid-btn--daily min-w-[90px] px-4 py-2 text-sm"
                    >
                        데일리
                    </button>
                    <button
                        onClick={handleWeeklyClick}
                        disabled={isCheckingWeekly}
                        className="liquid-btn liquid-btn--deep min-w-[90px] px-4 py-2 text-sm"
                    >
                        {isCheckingWeekly ? "확인 중..." : "위클리"}
                    </button>
                </div>

                {/* 3. 사용자 프로필 */}
                <div className="flex items-center pl-2">
                    <button
                        type="button"
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-white/10 transition"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold">
                            {displayName.slice(0, 1)}
                        </span>
                        <div className="leading-tight hidden sm:block">
                            <p className="text-xs font-semibold text-slate-100">{displayName}</p>
                            <p className="text-[10px] text-slate-400">MY PAGE</p>
                        </div>
                    </button>
                </div>
            </div>

            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4" onClick={() => setIsProfileModalOpen(false)}>
                    <div
                        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
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
                                className="rounded-lg border border-indigo-300/40 bg-indigo-500/20 px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-500/30 transition"
                            >
                                마이페이지
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsProfileModalOpen(false)}
                                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 transition"
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="rounded-lg border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm text-red-200 hover:bg-red-500/30 transition disabled:opacity-60"
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
