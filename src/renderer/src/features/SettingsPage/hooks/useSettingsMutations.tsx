import log from "electron-log/renderer";
import { useToasts } from "~/features/Toasts/useToasts";
import { useBasicIpcCall } from "~/hooks/ipc/useBasicIpcCall";
import * as loggerHooks from "~/hooks/ipc/useLogger";

export function useSettingsMutations() {
  const { createToast } = useToasts();

  const importDropsFile = useBasicIpcCall("load-drops-file", {
    preToast: "Loading Drops file"
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
    importDropsFile,
    importRunnerCSVFile,
    reloadEventsFile,
    reinitializeDatabase
  };
}
