import { useState, useEffect } from "react";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore } from "../../../store/uiStore";
import { hasTodayDailyEntry } from "../../../utils/dailyLimit";
import { AlertModal } from "../../../components/shared/AlertModal"; // 🚨 AlertModal 임포트

export default function FloatingDock() {
    const user = useAuthStore((state) => state.user);
    const isDockHidden = useUiStore((state) => state.isDockHidden);
    const isOverlayOpen = useUiStore((state) => state.isOverlayOpen);
    const isDailyContentModalOpen = useUiStore((state) => state.isDailyContentModalOpen);
    const isDailyDetailModalOpen = useUiStore((state) => state.isDailyDetailModalOpen);
    const setDailyContentModalOpen = useUiStore((state) => state.setDailyContentModalOpen);
    const setDailyDetailModalOpen = useUiStore((state) => state.setDailyDetailModalOpen);
    const setWeeklyContentModalOpen = useUiStore((state) => state.setWeeklyContentModalOpen);
    const setWeeklyHtpModalOpen = useUiStore((state) => state.setWeeklyHtpModalOpen);
    const setIsMyUniverseOpen = useUiStore((state) => state.setIsMyUniverseOpen);
    const setSelectedStarId = useUiStore((state) => state.setSelectedStarId);

    const [isCheckingWeekly, setIsCheckingWeekly] = useState(false);
    const [isDailyCompleted, setIsDailyCompleted] = useState(false);

    // 🚨 알림(Toast/Modal) 상태 추가
    const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: "success" | "error" }>({
        isOpen: false,
        message: "",
        type: "error",
    });

    useEffect(() => {
        const checkDailyStatus = async () => {
            try {
                const done = await hasTodayDailyEntry();
                setIsDailyCompleted(done);
            } catch (error) {
                console.error("데일리 상태 확인 실패:", error);
            }
        };

        if (!isOverlayOpen && !isDailyContentModalOpen && !isDailyDetailModalOpen) {
            void checkDailyStatus();
        }
    }, [isOverlayOpen, isDailyContentModalOpen, isDailyDetailModalOpen]);

    const glassButtonClass = "inline-flex h-8 sm:h-9 lg:h-10 items-center justify-center rounded-[12px] border border-white/22 bg-white/14 px-2.5 sm:px-3 lg:px-4 text-[11px] sm:text-xs lg:text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/24 hover:border-white/45 hover:backdrop-blur-xl hover:shadow-[0_8px_24px_rgba(148,163,184,0.26),inset_0_1px_0_rgba(255,255,255,0.58)]";

    const displayName = user?.nickname || user?.name || user?.email?.split("@")[0] || "사용자";

    const handleWeeklyClick = async () => {
        if (isCheckingWeekly) {
            return;
        }

        setIsCheckingWeekly(true);
        try {
            setWeeklyHtpModalOpen(false);
            setWeeklyContentModalOpen(true);
        } catch {
            setWeeklyHtpModalOpen(false);
            setWeeklyContentModalOpen(true);
        } finally {
            setIsCheckingWeekly(false);
        }
    };

    // 🚨 데일리 클릭 핸들러 추가
    const handleDailyClick = () => {
        if (isDailyCompleted) {
            setAlert({
                isOpen: true,
                message: "이미 빛나는 별 하나를 심으셨네요! 내일 또 다른 별을 만들어봐요.",
                type: "success", // 에러 느낌이 싫으시면 "success" 로 변경하셔도 좋습니다.
            });
            return;
        }
        setDailyDetailModalOpen(false);
        setDailyContentModalOpen(true);
    };

    return (
        <>
            <div
                id="floating-dock-container"
                className={`fixed bottom-3 sm:bottom-4 lg:bottom-6 left-1/2 z-50 flex w-[min(calc(100vw-0.75rem),44rem)] sm:w-[min(calc(100vw-1rem),48rem)] lg:w-auto -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 sm:gap-2 lg:gap-3 px-1 transition-all duration-700 ${isDockHidden
                    || isOverlayOpen
                    ? "translate-y-[150%] opacity-0 pointer-events-none"
                    : "translate-y-0 opacity-100 pointer-events-auto"
                    }`}
            >
                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
                    <button
                        id="weekly-star-btn"
                        onClick={handleWeeklyClick}
                        disabled={isCheckingWeekly}
                        className={`${glassButtonClass} min-w-[64px] sm:min-w-[76px] lg:min-w-[90px]`}
                    >
                        {isCheckingWeekly ? "CHECKING..." : "WEEKLY"}
                    </button>

                    {/* 🚨 버튼 스타일은 원래대로 복구하고 onClick만 변경 */}
                    <button
                        id="daily-star-btn"
                        onClick={handleDailyClick}
                        className={`${glassButtonClass} min-w-[64px] sm:min-w-[76px] lg:min-w-[90px]`}
                    >
                        DAILY
                    </button>
                </div>

                <div className="flex items-center">
                    <button
                        id="mypage-btn"
                        type="button"
                        onClick={() => { setSelectedStarId("center-mypage-star"); setIsMyUniverseOpen(true); }}
                        className="inline-flex h-8 sm:h-9 lg:h-10 max-w-[44vw] sm:max-w-[40vw] lg:max-w-none items-center gap-1.5 sm:gap-2 rounded-[12px] border border-white/22 bg-white/14 px-2.5 sm:px-3 lg:px-4 text-[11px] sm:text-xs lg:text-sm font-semibold text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/24 hover:border-white/45 hover:backdrop-blur-xl hover:shadow-[0_8px_24px_rgba(148,163,184,0.26),inset_0_1px_0_rgba(255,255,255,0.58)]"
                    >
                        <span className="flex h-5.5 w-5.5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold">
                            {displayName.slice(0, 1)}
                        </span>
                        <span className="hidden lg:inline max-w-[8rem] truncate text-sm font-semibold text-slate-100">{displayName}</span>
                        <span className="text-[10px] sm:text-[11px] lg:text-xs font-semibold tracking-wide text-slate-300">MYPAGE</span>
                    </button>
                </div>
            </div>

            {/* 🚨 AlertModal 컴포넌트 추가 */}
            <AlertModal
                isOpen={alert.isOpen}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert((prev) => ({ ...prev, isOpen: false }))}
            />
        </>
    );
}