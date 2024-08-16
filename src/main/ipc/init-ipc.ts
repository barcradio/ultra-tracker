import { initdbSettingsHandlers } from "./dbsettings-ipc";
import { initRunnerFormHandlers } from "./runnerform-ipc";
import { initSettingsHandlers } from "./settings-ipc";

export function initializeIpcHandlers() {
  initdbSettingsHandlers();
  initRunnerFormHandlers();
  initSettingsHandlers();
}
