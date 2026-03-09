import { Link } from "react-router-dom";

type NavLogoProps = {
  title?: string;
};

function NavLogo({ title = "Would you draw" }: NavLogoProps) {
  return (
    <Link
      to="/"
      className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-100 [font-family:'Manrope',sans-serif]"
    >
      <span className="hidden sm:inline">{title}</span>
    </Link>
  );
}

export default NavLogo;
