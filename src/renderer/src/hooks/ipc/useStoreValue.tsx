import { useQuery } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

export function useStoreValue(key: string) {
  const { createToast } = useToasts();
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["store", "get", "station", key],
    queryFn: async () => {
      const response = await ipcRenderer.invoke("get-store-value", key);

      if (response === undefined)
        createToast({ type: "danger", message: `Store value ${key} not found` });

      return response;
    }
  });
}
