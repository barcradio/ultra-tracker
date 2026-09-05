import { useQueryClient } from "@tanstack/react-query";
import { useStoreValue } from "~/hooks/ipc/useStoreValue";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

export const FAST_MODE_IN_OUT_BUTTON_STORE_KEY = "display.showFastModeInOutButton";
const QUERY_KEY = ["store", "get", "station", FAST_MODE_IN_OUT_BUTTON_STORE_KEY];

export function useFastModeInOutButton() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const { data } = useStoreValue<boolean>(FAST_MODE_IN_OUT_BUTTON_STORE_KEY);
  const enabled = data ?? false;

  const setEnabled = (value: boolean) => {
    queryClient.setQueryData(QUERY_KEY, value);
    void ipcRenderer.invoke("set-store-value", {
      key: FAST_MODE_IN_OUT_BUTTON_STORE_KEY,
      value
    });
  };

  return { enabled, setEnabled };
}
