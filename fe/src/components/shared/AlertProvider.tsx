import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import AlertModal from "./AlertModal";

type AlertType = "error" | "success";

interface AlertContextType {
  showAlert: (message: string, type?: AlertType, duration?: number) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<AlertType>("success");
  const [duration, setDuration] = useState(3000);

  const showAlert = useCallback((msg: string, t: AlertType = "success", d: number = 3000) => {
    setMessage(msg);
    setType(t);
    setDuration(d);
    setIsOpen(true);
  }, []);

  const hideAlert = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertModal
        isOpen={isOpen}
        message={message}
        type={type}
        duration={duration}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};
