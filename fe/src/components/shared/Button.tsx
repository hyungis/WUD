import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const baseStyles =
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border border-white/20 bg-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl hover:bg-white/20",
  secondary:
    "border border-white/30 bg-white/5 text-slate-100 backdrop-blur-xl hover:bg-white/15",
};

function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`.trim()}
      {...props}
    />
  );
}

export default Button;
