import { useQuery } from "@tanstack/react-query";
import { useIpcRenderer } from "./useIpcRenderer";

export function useAppInfo() {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["app-info"],
    queryFn: async (): Promise<string> => {
      const response = await ipcRenderer.invoke("get-app-version");
      return response;
    }
  });
}
