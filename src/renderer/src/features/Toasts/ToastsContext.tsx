import { createContext } from "react";

export interface Toast {
  message: string;
  type: "info" | "success" | "error";
}

export interface InternalToast extends Toast {
  id: number;
}

export interface ToastsContextType {
  createToast: (toast: Toast) => void;
  removeToast: (id: number) => void;
}

export const ToastsContext = createContext<ToastsContextType>({
  createToast: () => {
    throw new Error("ToastsContext is not provided!");
  },
  removeToast: () => {
    throw new Error("ToastsContext is not provided!");
  }
});
