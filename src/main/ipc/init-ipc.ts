import { initAthleteHandlers } from "./athletes-ipc";
import { initdbSettingsHandlers } from "./dbsettings-ipc";
import { initEventLogsHandlers } from "./eventLogs-ipc";
import { initExportHandlers } from "./export-ipc";
import { initResourceHandlers } from "./resource-ipc";
import { initRunnerFormHandlers } from "./runnerform-ipc";
import { initSettingsHandlers } from "./settings-ipc";
import { initStationHandlers } from "./stations-ipc";
import { initStatsHandlers } from "./stats-ipc";

export function initializeIpcHandlers() {
  initAthleteHandlers();
  initdbSettingsHandlers();
  initExportHandlers();
  initResourceHandlers();
  initEventLogsHandlers();
  initRunnerFormHandlers();
  initSettingsHandlers();
  initStatsHandlers();
  initStationHandlers();
}
