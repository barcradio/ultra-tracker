import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { Station } from "$shared/models";
import { SetStationIdentityParams } from "$shared/types";
import { useIpcRenderer } from "../useIpcRenderer";

export function useStation() {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["station"],
    queryFn: async (): Promise<Station> => {
      const station: Station = await ipcRenderer.invoke("app-settings", "station");
      return station;
    }
  });
}

export function useSetStationIdentity() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SetStationIdentityParams) => {
      const newStation: Station = await ipcRenderer.invoke("set-station-identity", params);

      if (!newStation) {
        createToast({ message: "Failed to update Station Identity", type: "danger" });
        return;
      }

      createToast({ message: "Station Identity Updated", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["station"] });
    }
  });
}
