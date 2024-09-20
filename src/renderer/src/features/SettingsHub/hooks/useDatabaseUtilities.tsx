import { useMutation } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

export function useInitializeDatabase() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("initialize-database", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}

export function useClearDatabase() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("clear-database", message),
    onSuccess: (data) => createToast({ message: data, type: "warning" }),
    onError: (error) => console.error(error)
  });
}
