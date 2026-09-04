import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DropReason, RecordStatus } from "$shared/enums";
import { RunnerAthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { useHandleStatusToasts } from "../useHandleStatusToasts";
import { useIpcRenderer } from "../useIpcRenderer";

export interface Runner {
  id: number;
  bibId: number;
  in: Date | null;
  out: Date | null;
  note: string;
}

export interface RunnerEx extends Runner {
  sequence: number;
  sent: boolean;
  openSplitTimeAuthenticated: boolean;
  dropped: boolean;
  dropReason: DropReason;
  status: RecordStatus;
  openSplitTimePushStatus?: "success" | "pending" | "error";
  openSplitTimePushError?: string;
}

export function useRunnerData() {
  const handleError = useHandleStatusToasts();
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();

  // A background OST push (triggered by an edit/insert) can finish after that mutation's own IPC
  // response already returned, so its push status wouldn't otherwise be reflected until some
  // unrelated refetch happens.
  useEffect(() => {
    const handleRunnersTableChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
    };

    ipcRenderer.on("runners-table-changed", handleRunnersTableChanged);

    return () => {
      ipcRenderer.removeAllListeners("runners-table-changed");
    };
  }, [ipcRenderer, queryClient]);

  return useQuery({
    queryKey: ["runners-table"],
    queryFn: async (): Promise<RunnerEx[]> => {
      const [response, authResult] = await Promise.all([
        ipcRenderer.invoke("get-runners-table", { includeDrops: true }),
        ipcRenderer.invoke("opensplittime-get-auth-status")
      ]);
      const [data, status, message]: DatabaseResponse<RunnerAthleteDB[]> = response;
      const { authenticated } = authResult as { authenticated: boolean };

      const success = handleError(status, message);

      if (!success) return [];

      return data!.map((runner, index) => ({
        id: runner.index,
        sequence: index + 1,
        bibId: runner.bibId,
        in: runner.timeIn,
        out: runner.timeOut,
        note: runner.note,
        sent: runner.sent,
        openSplitTimeAuthenticated: authenticated,
        dropped: runner.dropped ?? false,
        dropReason: runner.dropReason ?? DropReason.None,
        status: runner.status ?? RecordStatus.OK,
        openSplitTimePushStatus: runner.openSplitTimePushStatus,
        openSplitTimePushError: runner.openSplitTimePushError
      }));
    }
  });
}
