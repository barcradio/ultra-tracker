import { useQueryClient } from "@tanstack/react-query";
import { useStoreValue } from "~/hooks/ipc/useStoreValue";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

export const AUTO_UPDATE_STORE_KEY = "display.autoUpdate";
const QUERY_KEY = ["store", "get", "station", AUTO_UPDATE_STORE_KEY];

export function useAutoUpdate() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const { data, isLoading } = useStoreValue<boolean>(AUTO_UPDATE_STORE_KEY);
  const enabled = data ?? true;

  const setEnabled = (value: boolean) => {
    queryClient.setQueryData(QUERY_KEY, value);
    void ipcRenderer.invoke("set-store-value", {
      key: AUTO_UPDATE_STORE_KEY,
      value
    });
  };

  const checkNow = () => {
    void ipcRenderer.invoke("check-for-app-updates");
  };

  return { enabled, isLoading, setEnabled, checkNow };
}
