import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { DatabaseStatus } from "$shared/enums";
import { DatabaseResponse } from "$shared/types";
import { RunnerEx } from "./useRunnerData";
import { useIpcRenderer } from "../useIpcRenderer";

export function useSetAthleteProgress() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const { createToast } = useToasts();

  const handleDuplicate = async (data: RunnerEx) => {
    const send = { bibId: data.bibId, index: data.id };
    const response = await ipcRenderer.invoke("is-duplicate-bib", send);
    const [isDuplicate, status, message] = response as DatabaseResponse<boolean>;

    if (status !== DatabaseStatus.Success) {
      createToast({ message, type: "danger" });
      return;
    }

    if (isDuplicate) {
      return { ...data, bibId: parseFloat(`${data.bibId}.2`) };
    }

    return data;
  };

  return useMutation({
    mutationFn: async (data: RunnerEx) => {
      const updatedData = await handleDuplicate(data);

      console.log("updatedData", updatedData);

      return Promise.all([
        ipcRenderer.invoke("set-dnf", updatedData),
        ipcRenderer.invoke("set-dns", updatedData)
      ]);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
      queryClient.invalidateQueries({ queryKey: ["stats-table"] });
    },
    onError: (error) => console.error(error)
  });
}
