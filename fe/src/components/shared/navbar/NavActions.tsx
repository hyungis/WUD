import { useAuthStore } from "../../../store/authStore";

type NavActionsProps = {
  showAuthActions?: boolean;
};

function NavActions({ showAuthActions = true }: NavActionsProps) {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.name || "김진지";

  if (!showAuthActions) {
    return null;
  }

  return (
    <div className="hidden items-center gap-3 md:flex">
      <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-slate-200">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold">
          {displayName.slice(0, 1)}
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-slate-100">{displayName}</p>
          <p className="text-[11px] text-slate-400">프로필</p>
        </div>
      </div>
    </div>
  );
}

export default NavActions;
