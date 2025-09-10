import { useQuery } from "@tanstack/react-query";
import { AthleteStatusDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { useHandleStatusToasts } from "../useHandleStatusToasts";
import { useIpcRenderer } from "../useIpcRenderer";

export function useAthlete(bibNumber: number, enabled: boolean = true) {
  const ipcRenderer = useIpcRenderer();
  const handleErrors = useHandleStatusToasts();

  return useQuery({
    enabled,
    queryKey: ["athletes-table", "athletes", bibNumber],
    queryFn: async (): Promise<AthleteStatusDB | null> => {
      const roundedBib = Math.floor(bibNumber); // HACK: Temporary handling of duplicate bib numbers
      const response = await ipcRenderer.invoke("get-athlete-by-bib", roundedBib);
      const [data, status, message] = response as DatabaseResponse<AthleteStatusDB>;
      const success = handleErrors(status, message);
      return success ? data : null;
    }
  });
}
