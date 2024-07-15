import { createContext } from "react";

export interface Toast {
  message: string;
  type: "info" | "success" | "danger" | "warning";
  timeoutMs?: number;
  noIcon?: boolean;
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
