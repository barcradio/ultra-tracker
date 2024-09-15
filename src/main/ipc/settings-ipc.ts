/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import appSettings from "electron-settings";
import { resetAppSettings } from "../../preload/data";
import * as rfid from "../lib/rfid-util";
import { Handler } from "../types";

const getAppSettings: Handler<string, object> = (_, path: string) => {
  return appSettings.get(path);
};

const resetSettings: Handler<string> = () => {
  resetAppSettings();
  return `${appSettings.file.name}: Reset!`;
};

const startRFID: Handler<string> = () => {
  return rfid.initializeRFID();
};

export const initSettingsHandlers = () => {
  ipcMain.handle("app-settings", getAppSettings);
  ipcMain.handle("reset-app-settings", resetSettings);
  ipcMain.handle("rfid-initialize", startRFID);
};
