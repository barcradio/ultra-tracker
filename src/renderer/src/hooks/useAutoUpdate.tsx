import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStoreValue } from "~/hooks/ipc/useStoreValue";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

export const AUTO_UPDATE_STORE_KEY = "display.autoUpdate";
export const UPDATE_CHANNEL_STORE_KEY = "display.updateChannel";
const QUERY_KEY = ["store", "get", "station", AUTO_UPDATE_STORE_KEY];
const UPDATE_CHANNEL_QUERY_KEY = ["app-update", "channel"];

export type AppUpdateChannel = "stable" | "beta";

export function useAutoUpdate() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const { data, isLoading } = useStoreValue<boolean>(AUTO_UPDATE_STORE_KEY);
  const channelQuery = useQuery({
    queryKey: UPDATE_CHANNEL_QUERY_KEY,
    queryFn: async (): Promise<AppUpdateChannel> => {
      const channel = await ipcRenderer.invoke("get-app-update-channel");
      return channel === "beta" ? "beta" : "stable";
    }
  });
  const enabled = data ?? true;
  const channel = channelQuery.data ?? "stable";

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

  const setChannel = (value: AppUpdateChannel) => {
    queryClient.setQueryData(UPDATE_CHANNEL_QUERY_KEY, value);
    void ipcRenderer.invoke("set-store-value", {
      key: UPDATE_CHANNEL_STORE_KEY,
      value
    });
  };

  return {
    enabled,
    isLoading,
    channel,
    isChannelLoading: channelQuery.isLoading,
    setEnabled,
    setChannel,
    checkNow
  };
}
