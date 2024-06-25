import { differenceInMilliseconds } from "date-fns";
import { useCurrentTime } from "~/hooks/useCurrentTime";
import { classed } from "~/lib/classed";
import { useToasts } from "./useToasts";
import type { InternalToast } from "./ToastsContext";

interface Props {
  toast: InternalToast;
}

const ToastWrapper = classed.div({
  base: "m-2 font-bold text-white rounded-md bg-slate-700 fill-forward",
  variants: {
    show: {
      true: "animate-bounce-right-in",
      false: "animate-bounce-right-out"
    },
    type: {
      info: "bg-yellow-400 text-slate-800",
      success: "bg-green-700",
      error: "bg-red-700"
    }
  }
});

function useProgress(toast: InternalToast) {
  const [now] = useCurrentTime(50);
  const msSinceCreation = differenceInMilliseconds(now, toast.epoch);
  const progress = msSinceCreation / toast.timeoutMs;
  return Math.min(Math.max(progress, 0), 1);
}

export function ToastComponent({ toast }: Props) {
  const { removeToast } = useToasts();
  const progress = useProgress(toast);
  const animationEvent = progress === 1 ? () => removeToast(toast.id) : undefined;

  return (
    <ToastWrapper type={toast.type} show={progress < 1} onAnimationEnd={animationEvent}>
      <div className="py-4 px-6">{toast.message}</div>
      <div
        className="bottom-0 left-0 h-1.5 rounded-bl-md opacity-70 transition-all origin-left bg-slate-200"
        style={{ transform: `scaleX(${1 - progress})` }}
      />
    </ToastWrapper>
  );
}
