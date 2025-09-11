import { useMutation } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { RfidSettings } from "$shared/models";
import { Toast } from "$shared/types";
import { useIpcRenderer } from "../useIpcRenderer";

interface Options {
  preToast?: string | Toast;
  successToastType?: Toast["type"];
}

export function useRfidIpcCall(channel: string, options: Options = {}) {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (settings?: RfidSettings) => {
      if (options.preToast) {
        if (typeof options.preToast === "string") {
          createToast({ message: options.preToast, type: "info" });
        } else {
          createToast(options.preToast);
        }
      }

      return ipcRenderer.invoke(channel, settings);
    },
    onSuccess: (data) => {
      if (String(data).trim() === "Failed to connect to RFID reader") {
        createToast({ message: data, type: "warning" });
      } else {
        createToast({ message: data, type: options.successToastType ?? "success" });
      }
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      createToast({ message: msg, type: "danger" });
      console.error(error);
    }
  });
}
