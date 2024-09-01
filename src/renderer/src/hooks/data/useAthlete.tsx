import { useQuery } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { DatabaseStatus } from "$shared/enums";
import { AthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { useIpcRenderer } from "../useIpcRenderer";

export function useAthlete(bibNumber: number) {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useQuery({
    queryKey: ["athletes-table", "athletes", bibNumber],
    queryFn: async (): Promise<AthleteDB | null> => {
      const response = await ipcRenderer.invoke("get-athlete-by-bib", bibNumber);
      const [data, status, message] = response as DatabaseResponse<AthleteDB>;

      if (status === DatabaseStatus.Error) {
        createToast({ message, type: "danger" });
        return null;
      } else {
        return data;
      }
    }
  });
}
