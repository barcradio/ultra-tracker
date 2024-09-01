import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RunnerDB } from "$shared/models";
import { Runner } from "./useRunnerData";
import { useHandleErrorToasts } from "../useHandleErrors";
import { useIpcRenderer } from "../useIpcRenderer";

// import { useToasts } from "~/features/Toasts/useToasts";
// import { Runner, useRunnerData } from "./useRunnerData";

const runnerToRunnerDB = (runner: Runner): RunnerDB => ({
  index: runner.id,
  bibId: runner.runner,
  stationId: -1, // will be set by the backend
  timeIn: runner.in?.toString() == "Invalid Date" ? null : runner.in,
  timeOut: runner.out?.toString() == "Invalid Date" ? null : runner.out,
  timeModified: new Date(),
  note: runner.note,
  sent: false, // New: sent flag is false, obviously; updated: sent flag is reset to false
  status: -1 // will be set by the backend
});

function useTimingMutation(channel: string) {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const handleError = useHandleErrorToasts();

  return useMutation({
    mutationFn: async (timeRecord: Runner) => {
      const response = await ipcRenderer.invoke(channel, runnerToRunnerDB(timeRecord));
      const [status, message] = response;
      handleError(status, message);
    },
    onSuccess: () => {
      // Invalidate the queries to refetch the data,
      // so that the new/updated timing record is displayed
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
      queryClient.invalidateQueries({ queryKey: ["stats-table"] });
    }
  });
}

export const useEditTiming = () => useTimingMutation("edit-timing-record");
export const useCreateTiming = () => useTimingMutation("add-timing-record");
export const useDeleteTiming = () => useTimingMutation("delete-timing-record");
