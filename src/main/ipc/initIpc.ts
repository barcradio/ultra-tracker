import { initRunnerFormHandlers } from "./runnerform-ipc";
import { initSettingsHandlers } from "./settings-ipc";

export function initializeIpcHandlers() {
  initSettingsHandlers();
  initRunnerFormHandlers();
}
