import { useQueryClient } from "@tanstack/react-query";
import { useStoreValue } from "~/hooks/ipc/useStoreValue";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

export const OPEN_EVENT_MANAGER_ON_STARTUP_STORE_KEY = "display.openEventManagerOnStartup";
const QUERY_KEY = ["store", "get", "station", OPEN_EVENT_MANAGER_ON_STARTUP_STORE_KEY];

export function useOpenEventManagerOnStartup() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const { data } = useStoreValue<boolean>(OPEN_EVENT_MANAGER_ON_STARTUP_STORE_KEY);
  const enabled = data ?? true;

  const setEnabled = (value: boolean) => {
    queryClient.setQueryData(QUERY_KEY, value);
    void ipcRenderer.invoke("set-store-value", {
      key: OPEN_EVENT_MANAGER_ON_STARTUP_STORE_KEY,
      value
    });
  };

  return { enabled, setEnabled };
}
