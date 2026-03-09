type NavMobileToggleProps = {
  onToggle?: () => void;
};

function NavMobileToggle({ onToggle }: NavMobileToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/20 md:hidden"
      aria-label="Open navigation"
    >
      Menu
    </button>
  );
}

export default NavMobileToggle;
