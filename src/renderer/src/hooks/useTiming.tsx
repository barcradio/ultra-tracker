import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RunnerDB } from "$shared/models";
import { useIpcRenderer } from "./useIpcRenderer";

export function useCreateTiming() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timeRecord: RunnerDB) => {
      return ipcRenderer.invoke("add-timing-record", timeRecord);
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
    mutationFn: (timeRecord: RunnerDB) => {
      return ipcRenderer.invoke("edit-timing-record", timeRecord);
    },
    onSuccess: () => {
      // Invalidate the runners-table query to refetch the data,
      // so that the new/updated timing record is displayed
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
    }
  });
}
