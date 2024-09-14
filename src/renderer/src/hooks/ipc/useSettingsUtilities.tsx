import { useMutation } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "../useIpcRenderer";

export function useResetAppSettings() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("reset-app-settings", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}

export function useRFIDInitialize() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("initialize-rfid", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}
