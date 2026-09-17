import { useMutation, useQueryClient } from "@tanstack/react-query";
import log from "electron-log/renderer";
import { useToasts } from "~/features/Toasts/useToasts";
import { useBasicIpcCall } from "~/hooks/ipc/useBasicIpcCall";
import * as loggerHooks from "~/hooks/ipc/useLogger";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { DatabaseStatus } from "$shared/enums";
import {
  ApplyDropsImportParams,
  DatabaseResponse,
  DropsImportPreview,
  DropsImportReport
} from "$shared/types";

export function useSettingsMutations() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const { createToast } = useToasts();

  const previewDropsFile = useMutation({
    mutationFn: async () => {
      createToast({ message: "Loading Drops file", type: "info" });
      return (await ipcRenderer.invoke(
        "preview-drops-file"
      )) as DatabaseResponse<DropsImportPreview>;
    },
    onError: (error) => console.error(error)
  });

  const applyDropsImport = useMutation({
    mutationFn: async (params: ApplyDropsImportParams) => {
      return (await ipcRenderer.invoke(
        "apply-drops-import",
        params
      )) as DatabaseResponse<DropsImportReport>;
    },
    onSuccess: ([, status, message]) => {
      createToast({ message, type: status === DatabaseStatus.Success ? "success" : "danger" });
      if (status !== DatabaseStatus.Success) return;

      [["runners-table"], ["athletes-table"], ["stats-table"]].forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
    onError: (error) => console.error(error)
  });

  const importRunnerCSVFile = useBasicIpcCall("import-runners-file", {
    preToast: "Loading Runners file"
  });

  const reloadEventsFile = useBasicIpcCall("reload-events-file", {
    preToast: "Reloading Events file",
    invalidateQueryKeys: [
      ["opensplittime-event-group-configured"],
      ["runners-table"],
      ["stations-list"],
      ["athletes-table"],
      ["stats-table"],
      ["station"]
    ]
  });

  const initializeDatabaseMutation = useBasicIpcCall("initialize-database");

  const clearDatabaseMutation = useBasicIpcCall("clear-database", {
    successToastType: "warning"
  });

  const resetAppSettingsMutation = useBasicIpcCall("reset-app-settings");

  const initializeRfid = useBasicIpcCall("rfid-initialize", {
    preToast: "Starting RFID Reader"
  });

  const disconnectRfid = useBasicIpcCall("rfid-disconnect", {
    preToast: "Disconnect RFID Reader"
  });

  const resetAppSettings = () => {
    log.info("testing renderer to main log");
    loggerHooks.useMainLogger("warning", "User click: Reset App Settings");
    createToast({ message: "App Settings: Resetting", type: "info" });
    resetAppSettingsMutation.mutate();
  };

  const reinitializeDatabase = () => {
    createToast({ message: "Reinitializing database!", type: "danger" });
    clearDatabaseMutation.mutate();
    initializeDatabaseMutation.mutate();
  };

  return {
    resetAppSettings,
    initializeRfid,
    disconnectRfid,
    previewDropsFile,
    applyDropsImport,
    importRunnerCSVFile,
    reloadEventsFile,
    reinitializeDatabase
  };
}
