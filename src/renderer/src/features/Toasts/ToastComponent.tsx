import { classed } from "~/lib/classed";
import type { InternalToast } from "./ToastsContext";

interface Props {
  toast: InternalToast;
}

const ToastWrapper = classed.div({
  base: "py-4 px-6 m-2 font-bold text-white animate-bounce-right bg-slate-700",
  variants: {
    type: {
      info: "bg-yellow-400 text-slate-800",
      success: "bg-green-700",
      error: "bg-red-700"
    }
  }
});

export function ToastComponent({ toast }: Props) {
  return <ToastWrapper type={toast.type}>{toast.message}</ToastWrapper>;
}
