import { Link } from "react-router-dom";

type NavLink = {
  label: string;
  to: string;
};

type NavLinksProps = {
  links: NavLink[];
};

function NavLinks({ links }: NavLinksProps) {
  return (
    <div className="hidden items-center gap-8 text-sm font-medium text-slate-200 md:flex">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="relative text-xs uppercase tracking-[0.35em] transition hover:text-white"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export default NavLinks;
