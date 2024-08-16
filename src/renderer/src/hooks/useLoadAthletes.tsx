import { useMutation } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "./useIpcRenderer";

export function useLoadAthletes() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("get-athletes-table", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}
