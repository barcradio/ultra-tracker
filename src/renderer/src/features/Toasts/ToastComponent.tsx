import { differenceInMilliseconds } from "date-fns";
import { useCurrentTime } from "~/hooks/useCurrentTime";
import { classed } from "~/lib/classed";
import type { InternalToast } from "./ToastsContext";

interface Props {
  toast: InternalToast;
  removeToast: (id: string) => void;
}

const ToastWrapper = classed.div({
  base: "m-2 font-bold rounded-md fill-forward",
  variants: {
    show: {
      true: "animate-bounce-right-in",
      false: "animate-bounce-right-out"
    },
    type: {
      info: "bg-primary text-on-primary",
      success: "bg-success text-on-surface",
      error: "bg-error text-on-surface"
    }
  }
});

function useProgress(toast: InternalToast) {
  const [now] = useCurrentTime(50);
  const msSinceCreation = differenceInMilliseconds(now, toast.epoch);
  const progress = msSinceCreation / toast.timeoutMs;
  return Math.min(Math.max(progress, 0), 1);
}

export function ToastComponent({ toast, removeToast }: Props) {
  const progress = useProgress(toast);
  const animationEvent = progress === 1 ? () => removeToast(toast.id) : undefined;

  return (
    <ToastWrapper type={toast.type} show={progress < 1} onAnimationEnd={animationEvent}>
      <div className="py-4 px-6">{toast.message}</div>
      <div
        className="bottom-0 left-0 h-1.5 rounded-bl-md opacity-70 transition-all origin-left bg-on-surface"
        style={{ transform: `scaleX(${1 - progress})` }}
      />
    </ToastWrapper>
  );
}
