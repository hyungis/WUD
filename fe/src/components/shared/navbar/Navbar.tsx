import NavActions from "./NavActions";
import NavLinks from "./NavLinks";
import NavLogo from "./NavLogo";
import NavMobileToggle from "./NavMobileToggle";

type NavLink = {
  label: string;
  to: string;
};

type NavbarProps = {
  links?: NavLink[];
  showAuthActions?: boolean;
  onMobileToggle?: () => void;
};

const defaultLinks: NavLink[] = [
  { label: "홈", to: "/" },
  { label: "대시보드", to: "/dashboard" },
];

function Navbar({
  links = defaultLinks,
  showAuthActions = true,
  onMobileToggle,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
        <div className="flex items-center justify-start">
          <NavLogo />
        </div>
        <div className="flex items-center justify-center">
          <NavLinks links={links} />
        </div>
        <div className="flex items-center justify-end gap-4">
          <NavActions showAuthActions={showAuthActions} />
          <NavMobileToggle onToggle={onMobileToggle} />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
