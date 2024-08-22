import { useQuery } from "@tanstack/react-query";
import { AthleteDB } from "$shared/models";
import { useIpcRenderer } from "./useIpcRenderer";

export function useAthletes() {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["athletes"],
    queryFn: async (): Promise<AthleteDB[]> => {
      const dataset: AthleteDB[] = await ipcRenderer.invoke("get-athletes-table");
      // TODO: Error handling
      return dataset;
    }
  });
}
