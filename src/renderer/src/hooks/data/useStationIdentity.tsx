import { useQuery } from "@tanstack/react-query";
import { StationIdentity } from "$shared/models";
import { useIpcRenderer } from "../useIpcRenderer";

export const useFakeStationIdentity = () => {
  return {
    aidStation: "12 Ranger Dip",
    callsign: "N8MLS"
  };
};

export function useStationIdentity() {
  const ipcRenderer = useIpcRenderer();

  // TODO: when station is set, we will need to invalidate this query, but not here
  //const queryClient = useQueryClient();
  //queryClient.invalidateQueries({ queryKey: ["footer-identity"] });

  return useQuery({
    queryKey: ["footer-identity"],
    queryFn: async (): Promise<StationIdentity> => {
      const dataset = await ipcRenderer.invoke("get-station-identity");
      return dataset;
    }
  });
}
