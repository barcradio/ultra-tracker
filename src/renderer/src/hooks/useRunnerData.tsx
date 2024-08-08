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

let runnerData: Array<Runner> = [];

export function useGetRunnerData(): Array<Runner> {
  const ipcRenderer = useIpcRenderer();

  ipcRenderer.invoke("get-runners-table", (_, dataset: Array<object>): Array<Runner> => {
    return GetRunnerData(dataset);
  });

  return runnerData; // this only executes on page load, not with the hook
}

export function useUpdateRunnerData(): Array<Runner> {
  const ipcRenderer = useIpcRenderer();

  ipcRenderer.on("on-update-runners-table", (_, dataset: Array<object>) => {
    return GetRunnerData(dataset);
  });

  return runnerData; // this only executes on page load, not with the hook
}

function GetRunnerData(dataset: Array<object>): Array<Runner> {
  MapDatasetToGrid(dataset);
  return runnerData;
}

// will need to eventually get the athelete information from the StartList table and combine them
function MapDatasetToGrid(dataset: Array<object>) {
  const records: Array<Runner> = [];
  dataset.forEach((row) => {
    const runner = {
      id: row.index,
      runner: parseInt(row.bib_id),
      sequence: row.index,
      in: row.time_in,
      out: row.time_out,
      notes: row.note,
      name: ""
      //runner: `${row.firstname} ${row.lastname}`,
      //station_id: row.station_id,
      //changed: row.last_changed
      //sent: row.sent
    };

    records.push(runner);
  });
  runnerData = records;
}
