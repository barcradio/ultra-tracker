import { initAthleteHandlers } from "./athletes-ipc";
import { initdbSettingsHandlers } from "./dbsettings-ipc";
import { initResourceHandlers } from "./resource-ipc";
import { initRunnerFormHandlers } from "./runnerform-ipc";
import { initSettingsHandlers } from "./settings-ipc";
import { initStatsHandlers } from "./stats-ipc";

export function initializeIpcHandlers() {
  initRunnerFormHandlers();
  initStatsHandlers();
  initdbSettingsHandlers();
  initSettingsHandlers();
  initAthleteHandlers();
  initResourceHandlers();
}
