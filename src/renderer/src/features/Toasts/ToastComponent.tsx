import { differenceInMilliseconds } from "date-fns";
import CheckIcon from "~/assets/icons/check-circle.svg?react";
import DangerIcon from "~/assets/icons/error-octagon.svg?react";
import InfoIcon from "~/assets/icons/info-circle.svg?react";
import WarningIcon from "~/assets/icons/warning-circle.svg?react";
import { Stack } from "~/components";
import { useCurrentTime } from "~/hooks/useCurrentTime";
import { classed } from "~/lib/classed";
import { type InternalToast } from "./ToastsContext";

interface Props {
  toast: InternalToast;
  removeToast: (id: string) => void;
}

const ToastWrapper = classed.div({
  base: "m-2 font-medium rounded-md w-84 fill-forward bg-surface-secondary text-on-component",
  variants: {
    show: {
      true: "animate-bounce-right-in",
      false: "animate-bounce-right-out"
    },
    type: {
      info: "[&>span]:bg-primary",
      success: "[&>span]:bg-success",
      warning: "[&>span]:bg-warning",
      danger: "[&>span]:bg-danger"
    }
  }
});

function useProgress(toast: InternalToast) {
  const [now] = useCurrentTime(50);
  const msSinceCreation = differenceInMilliseconds(now, toast.epoch);
  const progress = msSinceCreation / toast.timeoutMs;
  return Math.min(Math.max(progress, 0), 1);
}

function getToastIcon(type: InternalToast["type"]) {
  switch (type) {
    case "info":
      return <InfoIcon height={18} width={18} className="fill-primary" />;
    case "success":
      return <CheckIcon height={18} width={18} className="fill-success" />;
    case "warning":
      return <WarningIcon height={18} width={18} className="fill-warning" />;
    case "danger":
      return <DangerIcon height={18} width={18} className="fill-danger" />;
  }
}

export function ToastComponent({ toast, removeToast }: Props) {
  const progress = useProgress(toast);
  const animationEvent = progress === 1 ? () => removeToast(toast.id) : undefined;

  return (
    <ToastWrapper type={toast.type} show={progress < 1} onAnimationEnd={animationEvent}>
      <Stack direction="row" align="center" className="p-4">
        {!toast.noIcon && <div className="mr-4">{getToastIcon(toast.type)}</div>}
        <div className="font-bold">{toast.message}</div>
      </Stack>
      <span
        className="block bottom-0 left-0 h-1.5 rounded-bl-md transition-all origin-left"
        style={{ transform: `scaleX(${1 - progress})` }}
      />
    </ToastWrapper>
  );
}
