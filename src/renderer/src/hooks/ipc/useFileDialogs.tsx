import { useMutation } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "../useIpcRenderer";

export function useLoadStationsFile() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("load-stations-file", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}

export function useLoadAthletesFile() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("load-athletes-file", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}

export function useLoadDNSFile() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("load-dns-file", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}

export function useLoadDNFFile() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("load-dnf-file", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}
export function useImportRunnersFromCSV() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("import-runners-file", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}

export function useExportRunnersToCSV() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("export-runners-file", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}

export function useExportRunnersToIncrementalCSV() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("export-incremental-file", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}

export function useExportDNSRunnersToCSV() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("export-dns-file", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}

export function useExportDNFRunnersToCSV() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: (message: string) => ipcRenderer.invoke("export-dnf-file", message),
    onSuccess: (data) => createToast({ message: data, type: "success" }),
    onError: (error) => console.error(error)
  });
}
