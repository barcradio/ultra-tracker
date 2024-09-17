import { useQuery } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { DatabaseStatus } from "$shared/enums";
import { StationDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { useIpcRenderer } from "../useIpcRenderer";

export function useStations() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useQuery({
    queryKey: ["stations-list"],
    queryFn: async (): Promise<StationDB[]> => {
      const [data, status, message]: DatabaseResponse<StationDB[]> =
        await ipcRenderer.invoke("get-stations-list");

      if (status === DatabaseStatus.Error) {
        createToast({ message, type: "danger" });
        return [];
      } else {
        return data ?? [];
      }
    }
  });
}
