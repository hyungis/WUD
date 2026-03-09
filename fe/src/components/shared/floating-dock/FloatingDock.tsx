import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore } from "../../../store/uiStore";

export default function FloatingDock() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const isDockHidden = useUiStore((state) => state.isDockHidden);

    const displayName = user?.name || "임시 사용자";

    return (
        <div
            className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-slate-950/70 px-6 py-3 shadow-2xl backdrop-blur-md transition-all duration-700 ${isDockHidden
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
                    홈
                </Link>
                <button
                    onClick={() => navigate("/dashboard")}
                    className={`text-xs font-medium uppercase tracking-widest transition-colors ${location.pathname === "/dashboard" ? "text-white" : "text-slate-400 hover:text-white"}`}
                >
                    대시보드
                </button>
            </div>

            {/* 2. 주요 액션 (데일리, 심층) */}
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                <button
                    onClick={() => navigate("/daily/content")}
                    className="liquid-btn liquid-btn--daily min-w-[90px] px-4 py-2 text-sm"
                >
                    데일리
                </button>
                <button
                    onClick={() => navigate("/deep/content")}
                    className="liquid-btn liquid-btn--deep min-w-[90px] px-4 py-2 text-sm"
                >
                    심층
                </button>
            </div>

            {/* 3. 사용자 프로필 */}
            <div className="flex items-center pl-2">
                <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-slate-200 cursor-pointer hover:bg-white/10 transition">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold">
                        {displayName.slice(0, 1)}
                    </span>
                    <div className="leading-tight hidden sm:block">
                        <p className="text-xs font-semibold text-slate-100">{displayName}</p>
                        <p className="text-[10px] text-slate-400">프로필</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
