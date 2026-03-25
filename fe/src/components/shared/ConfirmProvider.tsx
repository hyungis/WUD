import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

interface ConfirmContextType {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback((opt: ConfirmOptions) => {
    setOptions(opt);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    resolvePromise?.(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    resolvePromise?.(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <AnimatePresence>
        {isOpen && options && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
            >
              {options.title && (
                <h3 className="mb-2 text-lg font-bold text-white">{options.title}</h3>
              )}
              <p className="mb-6 text-sm leading-relaxed text-zinc-300">
                {options.message}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleCancel}
                >
                  {options.cancelText || "아니오"}
                </Button>
                <Button
                  variant="primary"
                  className={`flex-1 ${options.type === "danger" ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30" : ""}`}
                  onClick={handleConfirm}
                >
                  {options.confirmText || "네"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};
