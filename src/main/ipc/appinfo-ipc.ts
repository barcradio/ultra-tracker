import { app, ipcMain } from "electron";
import { Handler } from "../types";

const getAppVersion: Handler<string> = () => {
  return app.getVersion();
};

export const initAppInfoHandlers = () => {
  ipcMain.handle("get-app-version", getAppVersion);
};
