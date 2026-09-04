import { useQuery } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "../useIpcRenderer";

export interface Stats {
  registeredAthletes: number;
  pendingArrivals: number;
  inStation: number;
  throughStation: number;
  finishedRace: number;
  totalDidNotStart: number;
  previousDrops: number;
  stationDrops: number;
  totalDrops: number;
  warnings: number;
  inStationDidNotStart: number;
  unknownAthletes: number;
  errors: number;
  duplicates: number;
}

export function useStatsData() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useQuery({
    queryKey: ["stats-table"],
    queryFn: async (): Promise<Stats | null> => {
      const response = await ipcRenderer.invoke("stats-calculate");

      if (!response) {
        createToast({ message: "Failed to get stats data", type: "danger" });
        return null;
      }

      return response;
    }
  });
}
