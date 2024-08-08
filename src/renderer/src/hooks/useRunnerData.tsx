import { useQuery } from "@tanstack/react-query";
import { RunnerDB } from "$shared/models";
import { useIpcRenderer } from "./useIpcRenderer";

export interface Runner {
  id: number;
  sequence: number;
  runner: number;
  in: Date;
  out: Date;
  notes: string;
  name: string;
}

export function useRunnerData() {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["runners-table"],
    queryFn: async (): Promise<Runner[]> => {
      const dataset = await ipcRenderer.invoke("get-runners-table");
      return dataset.map((runner: RunnerDB) => ({
        id: runner.index,
        sequence: runner.index,
        runner: runner.bib_id,
        in: new Date(runner.time_in),
        out: new Date(runner.time_out),
        notes: "",
        name: ""
      }));
    }
  });
}
