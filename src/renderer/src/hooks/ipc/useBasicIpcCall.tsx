import { useMutation } from "@tanstack/react-query";
import { Toast } from "~/features/Toasts/ToastsContext";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "../useIpcRenderer";

interface Options {
  preToast?: string | Toast;
  successToastType?: Toast["type"];
}

export function useBasicIpcCall(channel: string, options: Options = {}) {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: () => {
      if (options.preToast) {
        if (typeof options.preToast === "string") {
          createToast({ message: options.preToast, type: "info" });
        } else {
          createToast(options.preToast);
        }
      }

      return ipcRenderer.invoke(channel);
    },
    onSuccess: (data) =>
      createToast({ message: data, type: options.successToastType ?? "success" }),
    onError: (error) => console.error(error)
  });
}
