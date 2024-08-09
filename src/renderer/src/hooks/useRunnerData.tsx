import { useQuery } from "@tanstack/react-query";
import { formatDate } from "~/lib/datetimes";
import { RunnerDB } from "$shared/models";
import { useIpcRenderer } from "./useIpcRenderer";

export interface Runner {
  id: number;
  sequence: number;
  runner: number;
  in: Date | null;
  out: Date | null;
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
        in:
          runner.time_in == null
            ? formatDate(runner.time_in)
            : formatDate(new Date(runner.time_in)),
        out:
          runner.time_out == null
            ? formatDate(runner.time_out)
            : formatDate(new Date(runner.time_out)),
        notes: runner.note == null ? "" : runner.note,
        name: ""
      }));
    }
  });
}
