import { forwardRef, type InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={`w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-2xl transition placeholder:text-slate-400 focus:border-white/45 focus:outline-none focus:ring-2 focus:ring-white/35 ${className}`.trim()}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export default Input;
