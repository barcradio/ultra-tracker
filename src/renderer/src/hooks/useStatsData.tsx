import { useQuery } from "@tanstack/react-query";
import { useIpcRenderer } from "./useIpcRenderer";

export interface Stats {
  registeredAthletes: number;
  pendingArrivals: number;
  inStation: number;
  throughStation: number;
  finishedRace: number;
  totalDNS: number;
  previousDNF: number;
  stationDNF: number;
  totalDNF: number;
  warnings: number;
  errors: number;
}

export function useStatsData() {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["stats-table"],
    queryFn: async (): Promise<Stats> => {
      const dataset = await ipcRenderer.invoke("stats-calculate");
      return dataset as Stats;
    }
  });
}
