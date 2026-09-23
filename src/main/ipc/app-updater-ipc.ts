import { ipcMain } from "electron";
import { checkForAppUpdates } from "../services/app-updater";

export const initAppUpdaterHandlers = () => {
  ipcMain.handle("check-for-app-updates", () => checkForAppUpdates(true));
};