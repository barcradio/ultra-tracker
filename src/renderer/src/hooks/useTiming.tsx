import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RunnerDB, TimingRecord } from "$shared/models";
import { useIpcRenderer } from "./useIpcRenderer";

export function useCreateTiming() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timingRecord: TimingRecord) => {
      return ipcRenderer.invoke("add-timing-record", timingRecord);
    },
    onSuccess: () => {
      // Invalidate the runners-table query to refetch the data,
      // so that the new/updated timing record is displayed
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
    }
  });
}

export function useEditTiming() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timingRecord: RunnerDB) => {
      return ipcRenderer.invoke("edit-timing-record", timingRecord);
    },
    onSuccess: () => {
      // Invalidate the runners-table query to refetch the data,
      // so that the new/updated timing record is displayed
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
    }
  });
}
