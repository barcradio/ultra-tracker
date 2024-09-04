import { useQuery } from "@tanstack/react-query";
import { DNFType } from "$shared/enums";
import { RunnerAthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { useHandleStatusToasts } from "../useHandleStatusToasts";
import { useIpcRenderer } from "../useIpcRenderer";

export interface Runner {
  id: number;
  bibId: number;
  in: Date | null;
  out: Date | null;
  note: string;
}

export interface RunnerEx extends Runner {
  sequence: number;
  //dns: boolean;
  dnf: boolean;
  dnfType: DNFType;
}

export function useRunnerData() {
  const handleError = useHandleStatusToasts();
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["runners-table"],
    queryFn: async (): Promise<RunnerEx[]> => {
      const response = await ipcRenderer.invoke("get-runners-table", { includeDNF: true });
      const [data, status, message]: DatabaseResponse<RunnerAthleteDB[]> = response;

      const success = handleError(status, message);

      if (!success) return [];

      return data!.map((runner, index) => ({
        id: runner.index,
        sequence: index + 1,
        bibId: runner.bibId,
        in: runner.timeIn,
        out: runner.timeOut,
        note: runner.note,
        dnf: runner.dnf ?? false,
        dnfType: runner.dnfType ?? DNFType.None
      }));
    }
  });
}
