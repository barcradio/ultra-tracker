import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RunnerDB } from "$shared/models";
import { Runner } from "./useRunnerData";
import { useIpcRenderer } from "../useIpcRenderer";

const runnerToRunnerDB = (runner: Runner): RunnerDB => ({
  index: runner.id,
  bibId: runner.runner,
  stationId: -1, // will be set by the backend
  timeIn: runner.in?.toString() == "Invalid Date" ? null : runner.in,
  timeOut: runner.out?.toString() == "Invalid Date" ? null : runner.out,
  timeModified: new Date(),
  note: runner.note,
  sent: false // New: sent flag is false, obviously; updated: sent flag is reset to false
});

function useTimingMutation(channel: string) {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timeRecord: Runner) => {
      return ipcRenderer.invoke(channel, runnerToRunnerDB(timeRecord));
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
