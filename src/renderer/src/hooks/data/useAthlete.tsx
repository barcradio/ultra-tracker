import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { DatabaseStatus } from "$shared/enums";
import { AthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { RunnerEx } from "./useRunnerData";
import { useHandleStatusToasts } from "../useHandleStatusToasts";
import { useIpcRenderer } from "../useIpcRenderer";

export function useAthlete(bibNumber: number, enabled: boolean = true) {
  const ipcRenderer = useIpcRenderer();
  const handleErrors = useHandleStatusToasts();

  return useQuery({
    enabled,
    queryKey: ["athletes-table", "athletes", bibNumber],
    queryFn: async (): Promise<AthleteDB | null> => {
      const roundedBib = Math.floor(bibNumber); // HACK: Temporary handling of duplicate bib numbers
      const response = await ipcRenderer.invoke("get-athlete-by-bib", roundedBib);
      const [data, status, message] = response as DatabaseResponse<AthleteDB>;
      const success = handleErrors(status, message);
      return success ? data : null;
    }
  });
}

export function useSetAthleteStatus() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: async (data: RunnerEx) => {
      queryClient.invalidateQueries({ queryKey: ["runner-table"] });
      const response = await ipcRenderer.invoke("is-duplicate-bib", data.bibId);
      const [isDuplicate, status, message] = response as DatabaseResponse<boolean>;

      if (status !== DatabaseStatus.Success) {
        createToast({ message, type: "danger" });
        return;
      }

      if (isDuplicate) {
        data.bibId = parseInt(`${data.bibId}.2`);
      }

      return Promise.all([
        ipcRenderer.invoke("set-athlete-dnf", data),
        ipcRenderer.invoke("set-athlete-dns", data)
      ]);
    },

    onSuccess: (data) => data?.forEach((message) => createToast({ message, type: "success" })),
    onError: (error) => console.error(error)
  });
}
