import { useQuery } from "@tanstack/react-query";
import { DNFType } from "$shared/enums";
import { RunnerDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { useHandleStatusToasts } from "../useHandleStatusToasts";
import { useIpcRenderer } from "../useIpcRenderer";

export interface Runner {
  id: number;
  runner: number;
  in: Date | null;
  out: Date | null;
  note: string;
}

export interface RunnerEx extends Runner {
  sequence: number;
  dnfType: DNFType;
}

export function useRunnerData() {
  const handleError = useHandleStatusToasts();
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["runners-table"],
    queryFn: async (): Promise<RunnerEx[]> => {
      const response = await ipcRenderer.invoke("get-runners-table");
      const [data, status, message]: DatabaseResponse<RunnerDB[]> = response;

      const success = handleError(status, message);

      if (!success) return [];

      return data!.map((runner: RunnerDB, index: number) => ({
        id: runner.index,
        sequence: index + 1,
        runner: runner.bibId,
        in: runner.timeIn,
        out: runner.timeOut,
        note: runner.note,
        dnfType: DNFType.Unknown // TODO: get athlete dnf info
      }));
    }
  });
}
