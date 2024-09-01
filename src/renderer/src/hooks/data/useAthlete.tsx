import { useQuery } from "@tanstack/react-query";
import { AthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { useHandleErrorToasts } from "../useHandleErrors";
import { useIpcRenderer } from "../useIpcRenderer";

export function useAthlete(bibNumber: number, enabled: boolean = true) {
  const ipcRenderer = useIpcRenderer();
  const handleErrors = useHandleErrorToasts();

  return useQuery({
    enabled,
    queryKey: ["athletes-table", "athletes", bibNumber],
    queryFn: async (): Promise<AthleteDB | null> => {
      const roundedBib = Math.floor(bibNumber); // HACK: Temporary handling of duplicate bib numbers
      const response = await ipcRenderer.invoke("get-athlete-by-bib", roundedBib);
      const [data, status, message] = response as DatabaseResponse<AthleteDB>;
      const success = handleErrors(status, message);
      return success ? data : null;
    }
  });
}
