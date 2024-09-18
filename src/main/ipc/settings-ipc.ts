/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import * as rfid from "../lib/rfid-util";
import { appStore, clearAppStore } from "../lib/store";
import { Handler } from "../types";

const getAppStore: Handler<string, object> = (_, path: string) => {
  return appStore.get(path);
};

const resetAppStore: Handler<string> = () => {
  clearAppStore();
  return `${appStore.path}: Reset!`;
};

const startRFID: Handler<string> = () => {
  return rfid.initializeRFID();
};

export const initSettingsHandlers = () => {
  ipcMain.handle("app-store", getAppStore);
  ipcMain.handle("reset-app-settings", resetAppStore);
  ipcMain.handle("rfid-initialize", startRFID);
};
