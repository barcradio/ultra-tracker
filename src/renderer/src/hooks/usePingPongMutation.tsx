import { useMutation } from "@tanstack/react-query";
import { useIpcRenderer } from "./useIpcRenderer";

export function usePingPongMutation() {
  const ipcRenderer = useIpcRenderer();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("ping-pong", message),
    onError: (error) => console.error(error)
  });
}
