import { createContext } from "react";

export interface Toast {
  message: string;
  type: "info" | "success" | "error";
  timeoutMs?: number;
}

export interface InternalToast extends WithRequired<Toast, "timeoutMs"> {
  id: string;
  epoch: Date;
}

export interface ToastsContextType {
  createToast: (toast: Toast) => void;
}

export const ToastsContext = createContext<ToastsContextType>({
  createToast: () => {
    throw new Error("ToastsContext is not provided!");
  }
});
