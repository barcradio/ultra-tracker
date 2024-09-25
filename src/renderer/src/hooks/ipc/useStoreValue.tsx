import { useQuery } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

interface Options<T> {
  transform?: (value: unknown) => T;
}

export function useStoreValue<T>(key: string, options: Options<T> = {}) {
  const { createToast } = useToasts();
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["store", "get", "station", key],
    queryFn: async (): Promise<T> => {
      const response = await ipcRenderer.invoke("get-store-value", key);

      if (response === undefined)
        createToast({ type: "danger", message: `Store value ${key} not found` });

      return options.transform ? options.transform(response) : response;
    }
  });
}
