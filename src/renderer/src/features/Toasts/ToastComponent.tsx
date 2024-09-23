import { useState } from "react";
import { differenceInMilliseconds } from "date-fns";
import CheckIcon from "~/assets/icons/check-circle.svg?react";
import DangerIcon from "~/assets/icons/error-octagon.svg?react";
import InfoIcon from "~/assets/icons/info-circle.svg?react";
import WarningIcon from "~/assets/icons/warning-circle.svg?react";
import CloseIcon from "~/assets/icons/xmark.svg?react";
import { Stack } from "~/components";
import { useCurrentTime } from "~/hooks/useCurrentTime";
import { classed } from "~/lib/classed";
import { type InternalToast } from "./ToastsContext";

interface Props {
  toast: InternalToast;
  removeToast: (id: string) => void;
}

const ToastWrapper = classed.button({
  base: "block font-medium rounded-md w-84 fill-forward bg-surface-secondary text-on-component hover:bg-surface-tertiary transition group",
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
  const [open, setOpen] = useState(true);
  const progress = useProgress(toast);

  const animationEvent = progress === 1 || !open ? () => removeToast(toast.id) : undefined;

  return (
    <ToastWrapper
      type={toast.type}
      show={open && progress < 1}
      onAnimationEnd={animationEvent}
      onClick={() => setOpen(false)}
    >
      <Stack direction="row" align="center" className="p-4 pr-10">
        {!toast.noIcon && <div className="mr-4">{getToastIcon(toast.type)}</div>}
        <div className="font-bold">{toast.message}</div>
      </Stack>
      <span
        className="block bottom-0 left-0 h-1.5 rounded-bl-md transition-all origin-left"
        style={{ transform: `scaleX(${1 - progress})` }}
      />
      <CloseIcon className="absolute top-0 right-0 fill-on-surface h-4 w-4 mt-1 mr-2 group-hover:opacity-100 opacity-0" />
    </ToastWrapper>
  );
}
