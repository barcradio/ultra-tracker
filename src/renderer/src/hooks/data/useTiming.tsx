import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { DatabaseStatus } from "$shared/enums";
import { AthleteDB, RunnerDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { Runner } from "./useRunnerData";
import { ToastOnStatus, useHandleStatusToasts } from "../useHandleStatusToasts";
import { useIpcRenderer } from "../useIpcRenderer";

// import { useToasts } from "~/features/Toasts/useToasts";
// import { Runner, useRunnerData } from "./useRunnerData";

const runnerToRunnerDB = (runner: Runner): RunnerDB => ({
  index: runner.id,
  bibId: runner.bibId,
  stationId: -1, // will be set by the backend
  timeIn: runner.in?.toString() == "Invalid Date" ? null : runner.in,
  timeOut: runner.out?.toString() == "Invalid Date" ? null : runner.out,
  timeModified: new Date(),
  note: runner.note,
  sent: false, // New: sent flag is false, obviously; updated: sent flag is reset to false
  status: -1 // will be set by the backend
});

interface TimingMutationOptions {
  toastsOnStatus?: ToastOnStatus<Runner>;
  callback?: (timeRecord: Runner, status: DatabaseStatus) => void;
}

function useTimingMutation(channel: string, options: TimingMutationOptions = {}) {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const handleError = useHandleStatusToasts(options.toastsOnStatus);

  return useMutation({
    mutationFn: async (timeRecord: Runner) => {
      const response = await ipcRenderer.invoke(channel, runnerToRunnerDB(timeRecord));
      const [status, message] = response;
      handleError(status, message, timeRecord);
      options.callback?.(timeRecord, status);
    },
    onSuccess: () => {
      // Invalidate the queries to refetch the data,
      // so that the new/updated timing record is displayed
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
      queryClient.invalidateQueries({ queryKey: ["stats-table"] });
    }
  });
}

// export const useCreateTiming = () => useTimingMutation("add-timing-record");

export const useCreateTiming = () => {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useTimingMutation("add-timing-record", {
    callback: async (timeRecord, status) => {
      const athleteResponse = await ipcRenderer.invoke("get-athlete-by-bib", timeRecord.bibId);
      const [athlete] = athleteResponse as DatabaseResponse<AthleteDB>;

      // If no athlete with the bib number exists, show a warning
      if (athlete === null)
        createToast({
          message: `athletes: No athlete found with bibId: ${timeRecord.bibId}`,
          type: "warning",
          timeoutMs: -1
        });

      // If the timing record is a duplicate, show a warning
      if (status == DatabaseStatus.Duplicate)
        createToast({
          message: `Runner #${timeRecord.bibId} already has a timing record!`,
          type: "warning",
          timeoutMs: -1
        });
    }
  });
};

export const useEditTiming = () => {
  return useTimingMutation("edit-timing-record", {
    toastsOnStatus: {
      [DatabaseStatus.Updated]: (runner) => ({
        message: `Runner #${runner?.bibId} updated!`,
        type: "success"
      })
    }
  });
};

export const useDeleteTiming = () => {
  return useTimingMutation("delete-timing-record", {
    toastsOnStatus: {
      [DatabaseStatus.Deleted]: (runner) => ({
        message: `Runner #${runner?.bibId} deleted!`,
        type: "success"
      })
    }
  });
};
