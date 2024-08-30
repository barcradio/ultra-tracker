import { useQuery } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { DatabaseStatus } from "$shared/enums";
import { AthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { useIpcRenderer } from "../useIpcRenderer";

export function useAthletes() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useQuery({
    queryKey: ["athletes-table"],
    queryFn: async (): Promise<AthleteDB[]> => {
      const [data, status, message]: DatabaseResponse<AthleteDB[]> =
        await ipcRenderer.invoke("get-athletes-table");

      if (status === DatabaseStatus.Error) {
        createToast({ message, type: "danger" });
        return [];
      } else {
        return data ?? [];
      }
    }
  });
}
