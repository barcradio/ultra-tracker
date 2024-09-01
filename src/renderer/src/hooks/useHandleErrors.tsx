import { useCallback } from "react";
import { useToasts } from "~/features/Toasts/useToasts";
import { DatabaseStatus } from "$shared/enums";

export function useHandleErrorToasts() {
  const { createToast } = useToasts();

  const handleErrors = useCallback(
    (status: DatabaseStatus, message: string) => {
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
    [createToast]
  );

  return handleErrors;
}
