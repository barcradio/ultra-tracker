import { ipcMain } from "electron";
import { DropReason } from "$shared/enums";
import { RunnerAthleteDB } from "$shared/models";
import * as dbStatus from "../database/status-db";
import { Handler } from "../types";

const setDrop: Handler<RunnerAthleteDB> = (_, data) => {
  const hasValidDropReason = Object.values(DropReason).includes(data.dropReason as DropReason);
  const dropped =
    data.dropped === true && hasValidDropReason && data.dropReason !== DropReason.None;
  const dropReason = dropped ? (data.dropReason as DropReason) : DropReason.None;

  return dbStatus.SetDrop(data.bibId, data.timeOut, dropped, dropReason);
};

export const initStatusHandlers = () => {
  ipcMain.handle("set-drop", setDrop);
};
