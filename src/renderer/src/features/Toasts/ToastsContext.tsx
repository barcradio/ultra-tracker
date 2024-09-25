import { createContext } from "react";
import { Toast } from "$shared/types";

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
