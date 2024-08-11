import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RunnerDB } from "$shared/models";
import { useIpcRenderer } from "./useIpcRenderer";

function useTimingMutation(channel: string) {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timeRecord: RunnerDB) => {
      return ipcRenderer.invoke(channel, timeRecord);
    },
    onSuccess: () => {
      // Invalidate the queries to refetch the data,
      // so that the new/updated timing record is displayed
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
      queryClient.invalidateQueries({ queryKey: ["stats-table"] });
    }
  });
}

export const useCreateTiming = () => useTimingMutation("add-timing-record");
export const useEditTiming = () => useTimingMutation("edit-timing-record");
export const useDeleteTiming = () => useTimingMutation("delete-timing-record");
