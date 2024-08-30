import { useQuery } from "@tanstack/react-query";
import { RunnerDB } from "$shared/models";
import { useIpcRenderer } from "../useIpcRenderer";

export interface Runner {
  id: number;
  runner: number;
  in: Date | null;
  out: Date | null;
  note: string;
}

export interface RunnerWithSequence extends Runner {
  sequence: number;
}

export function useRunnerData() {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["runners-table"],
    queryFn: async (): Promise<RunnerWithSequence[]> => {
      const dataset = await ipcRenderer.invoke("get-runners-table");
      return dataset.map((runner: RunnerDB, index: number) => ({
        id: runner.index,
        sequence: index + 1,
        runner: runner.bibId,
        in: runner.timeIn,
        out: runner.timeOut,
        note: runner.note
      }));
    }
  });
}
