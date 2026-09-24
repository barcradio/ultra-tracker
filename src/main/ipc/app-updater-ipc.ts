import { ipcMain } from "electron";
import { checkForAppUpdates, getAppUpdateChannel } from "../services/app-updater";

export const initAppUpdaterHandlers = () => {
  ipcMain.handle("check-for-app-updates", () => checkForAppUpdates(true));
  ipcMain.handle("get-app-update-channel", () => getAppUpdateChannel());
};
