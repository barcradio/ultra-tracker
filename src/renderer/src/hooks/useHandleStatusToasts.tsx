import { useCallback } from "react";
import { Toast } from "~/features/Toasts/ToastsContext";
import { useToasts } from "~/features/Toasts/useToasts";
import { DatabaseStatus } from "$shared/enums";

type StatusToast<T> = Toast | ((data?: T) => Toast);
export type ToastOnStatus<T> = { [key in DatabaseStatus]?: StatusToast<T> };

export function useHandleStatusToasts<T>(specialToasts: ToastOnStatus<T> = {}) {
  const { createToast } = useToasts();

  const createSpecialToast = useCallback(
    (status: DatabaseStatus, data?: T) => {
      const toast = specialToasts[status];
      if (typeof toast === "function") {
        createToast(toast(data));
      } else if (toast) {
        createToast(toast);
      }
    },
    [createToast, specialToasts]
  );

  const handleErrors = useCallback(
    (status: DatabaseStatus, message: string, data?: T) => {
      if (specialToasts[status]) createSpecialToast(status, data);

      switch (status) {
        case DatabaseStatus.Created:
        case DatabaseStatus.Updated:
        case DatabaseStatus.Deleted:
        case DatabaseStatus.Success:
          return true;
        case DatabaseStatus.NotFound:
          createToast({ message, type: "warning" });
          return false;
        case DatabaseStatus.Duplicate:
          createToast({ message, type: "warning" });
          return true;
        case DatabaseStatus.Error:
          createToast({ message, type: "danger" });
          return false;
        default:
          createToast({ message: "Something went wrong", type: "danger" });
          return false;
      }
    },
    [createToast, specialToasts, createSpecialToast]
  );

  return handleErrors;
}
