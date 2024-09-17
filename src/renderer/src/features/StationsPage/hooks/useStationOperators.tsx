import { useQuery } from "@tanstack/react-query";
import { useHandleStatusToasts } from "~/hooks/useHandleStatusToasts";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { DatabaseStatus } from "$shared/enums";
import { Operator } from "$shared/models";

export function useStationOperators(stationId?: string) {
  const ipcRenderer = useIpcRenderer();
  const handleError = useHandleStatusToasts();

  return useQuery({
    enabled: !!stationId,
    queryKey: ["station-operators", stationId],
    queryFn: async (): Promise<Operator[]> => {
      const [data, status, message] = await ipcRenderer.invoke("get-station-operators", stationId);
      if (status === DatabaseStatus.Success) return data;
      handleError(status, message);
      return [];
    }
  });
}
