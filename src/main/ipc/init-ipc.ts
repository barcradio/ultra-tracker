import { initAthleteHandlers } from "./athletes-ipc";
import { initdbSettingsHandlers } from "./dbsettings-ipc";
import { initEventLogsHandlers } from "./eventLogs-ipc";
import { initExportHandlers } from "./export-ipc";
import { initFooterHandlers } from "./footer-ipc";
import { initResourceHandlers } from "./resource-ipc";
import { initRFIDHandlers } from "./rfid-ipc";
import { initRunnerFormHandlers } from "./runnerform-ipc";
import { initSettingsHandlers } from "./settings-ipc";
import { initStatsHandlers } from "./stats-ipc";

export function initializeIpcHandlers() {
  initAthleteHandlers();
  initdbSettingsHandlers();
  initExportHandlers();
  initFooterHandlers();
  initResourceHandlers();
  initEventLogsHandlers();
  initRFIDHandlers();
  initRunnerFormHandlers();
  initSettingsHandlers();
  initStatsHandlers();
}
