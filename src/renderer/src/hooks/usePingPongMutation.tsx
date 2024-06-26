import { useMutation } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "./useIpcRenderer";

export function usePingPongMutation() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("ping-pong", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}
