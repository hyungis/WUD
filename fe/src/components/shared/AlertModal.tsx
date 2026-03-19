import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AlertModalProps {
  isOpen: boolean;
  message: string;
  type?: "error" | "success";
  onClose: () => void;
  duration?: number;
}

export function AlertModal({
  isOpen,
  message,
  type = "success",
  onClose,
  duration = 3000,
}: AlertModalProps) {
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsAnimatingOut(false);
      
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isOpen, duration]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
      setIsRendered(false);
      setIsAnimatingOut(false);
    }, 400); // match animation duration
  };

  if (!isRendered && !isOpen) return null;

  const bgColor = type === "success" ? "bg-[#20c997]" : "bg-[#e11d48]";
  const icon = type === "success" ? "check_circle" : "warning";

  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none w-full flex justify-center px-4">
      <div
        className={`flex items-center gap-2.5 px-6 py-2.5 shadow-2xl text-white rounded-full border border-white/10 backdrop-blur-md transition-transform pointer-events-auto ${bgColor} ${
          isAnimatingOut ? "animate-slideUp" : "animate-slideDown"
        }`}
        role="alert"
      >
        <span className="material-symbols-outlined text-[20px] opacity-90">
          {icon}
        </span>
        <span className="font-semibold text-sm tracking-tight whitespace-nowrap">
          {message}
        </span>
      </div>
    </div>,
    document.body
  );
}

export default AlertModal;
