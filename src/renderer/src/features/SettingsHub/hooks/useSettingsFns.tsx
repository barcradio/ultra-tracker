import log from "electron-log/renderer";
import { useToasts } from "~/features/Toasts/useToasts";
import * as dbUtilHooks from "./useDatabaseUtilities";
import * as dialogHooks from "./useFileDialogs";
import * as loggerHooks from "./useLogger";
import * as settingsHooks from "./useSettingsUtilities";

export function useSettingsFns() {
  const { createToast } = useToasts();

  const loadAthletes = dialogHooks.useLoadAthletesFile();
  const loadStation = dialogHooks.useLoadStationsFile();
  const loadDNS = dialogHooks.useLoadDNSFile();
  const loadDNF = dialogHooks.useLoadDNFFile();
  const initializeDatabaseMutation = dbUtilHooks.useInitializeDatabase();
  const clearDatabaseMutation = dbUtilHooks.useClearDatabase();
  const importRunnersFile = dialogHooks.useImportRunnersFromCSV();
  const resetAppSettingsMutation = settingsHooks.useResetAppSettings();
  const rfidInitMutation = settingsHooks.useRFIDInitialize();

  const resetAppSettings = () => {
    log.info("testing renderer to main log");
    loggerHooks.useMainLogger("warning", "User click: Reset App Settings");
    createToast({ message: "App Settings: Resetting", type: "info" });
    resetAppSettingsMutation.mutate("resetAppSettings");
  };

  const rfidInitialize = () => {
    createToast({ message: "App Settings: Resetting", type: "info" });
    rfidInitMutation.mutate("resetAppSettings");
  };

  const importAthletesFile = () => {
    createToast({ message: "Loading Athletes file", type: "info" });
    loadAthletes.mutate("ping from the renderer!");
  };

  const importStationsFile = () => {
    createToast({ message: "Loading Stations file", type: "info" });
    loadStation.mutate("ping from the renderer!");
  };

  const importDNSFile = () => {
    createToast({ message: "Loading DNS file", type: "info" });
    loadDNS.mutate("ping from the renderer!");
  };

  const importDNFFile = () => {
    createToast({ message: "Loading DNF file", type: "info" });
    loadDNF.mutate("ping from the renderer!");
  };

  const importRunnerCSVFile = () => {
    createToast({ message: "Importing from CSV file", type: "info" });
    importRunnersFile.mutate("ping from the renderer!");
  };

  const initializeDatabase = () => {
    createToast({ message: "Reinitializing database!", type: "danger" });
    clearDatabaseMutation.mutate("Clearing Database of all tables!");
    initializeDatabaseMutation.mutate("Initializing Database!");
  };

  return {
    resetAppSettings,
    rfidInitialize,
    importAthletesFile,
    importStationsFile,
    importDNSFile,
    importDNFFile,
    importRunnerCSVFile,
    initializeDatabase
  };
}
