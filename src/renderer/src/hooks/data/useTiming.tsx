import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RunnerDB } from "$shared/models";
import { Runner } from "./useRunnerData";
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

interface TimingMutationOptions {
  onMutate?: (runner: Runner) => void;
}

function useTimingMutation(channel: string, options?: TimingMutationOptions) {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timeRecord: Runner) => {
      options?.onMutate?.(timeRecord);
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

export const useEditTiming = () => useTimingMutation("edit-timing-record");
export const useCreateTiming = () => useTimingMutation("add-timing-record");
export const useDeleteTiming = () => useTimingMutation("delete-timing-record");

// This was a temporary UX improvement that will be replaced by a more robust error handling mechanism later.
// May need elements of this for handling RecordStatus property on records
// export const useCreateTiming = () => {
//   const { createToast } = useToasts();
//   const { data } = useRunnerData();

//    const onMutate = (runner: Runner) => {
//      const existing = data?.find((r) => r.runner == runner.runner);
//      if (!existing) return
//      if (existing.in && runner.in && existing.in.getTime() != runner.in.getTime()) {
//        createToast({ type: "warning", message: `Overrode #${runner.runner}'s previous In Time` });

//      if (existing.out && runner.out && existing.out.getTime() != runner.out.getTime()) {
//        createToast({ type: "warning", message: `Overrode #${runner.runner}'s previous Out Time` });
//      }
//    };

//   return useTimingMutation("add-timing-record", { onMutate });
// };
