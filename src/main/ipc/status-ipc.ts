import { ipcMain } from "electron";
import { RunnerAthleteDB } from "$shared/models";
import * as dbStatus from "../database/status-db";
import { Handler } from "../types";

const setDrop: Handler<RunnerAthleteDB> = (_, data) => {
  return dbStatus.SetDrop(data.bibId, data.timeOut, data.dropped!, data.dropReason!);
};

export const initStatusHandlers = () => {
  ipcMain.handle("set-drop", setDrop);
};
