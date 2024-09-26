import { initAppInfoHandlers } from "./appinfo-ipc";
import { initAthleteHandlers } from "./athletes-ipc";
import { initdbSettingsHandlers } from "./dbsettings-ipc";
import { initEventLogsHandlers } from "./eventLogs-ipc";
import { initExportHandlers } from "./export-ipc";
import { initResourceHandlers } from "./resource-ipc";
import { initRFIDHandlers } from "./rfid-ipc";
import { initRunnerFormHandlers } from "./runnerform-ipc";
import { initSettingsHandlers } from "./settings-ipc";
import { initStationHandlers } from "./stations-ipc";
import { initStatsHandlers } from "./stats-ipc";
import { initStoreHandlers } from "./store-ipc";

export function initializeIpcHandlers() {
  initAppInfoHandlers();
  initAthleteHandlers();
  initdbSettingsHandlers();
  initExportHandlers();
  initResourceHandlers();
  initEventLogsHandlers();
  initRFIDHandlers();
  initRunnerFormHandlers();
  initSettingsHandlers();
  initStatsHandlers();
  initStationHandlers();
  initStoreHandlers();
}
