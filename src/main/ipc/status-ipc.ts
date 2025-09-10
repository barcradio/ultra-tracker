import { ipcMain } from "electron";
import { RunnerAthleteDB } from "$shared/models";
import * as dbStatus from "../database/status-db";
import { Handler } from "../types";

const setDNS: Handler<RunnerAthleteDB> = (_, data) => {
  return dbStatus.SetDNS(data.bibId, data.dns!);
};

const setDNF: Handler<RunnerAthleteDB> = (_, data) => {
  return dbStatus.SetDNF(data.bibId, data.timeOut, data.dnf!, data.dnfType!);
};

export const initStatusHandlers = () => {
  ipcMain.handle("set-dns", setDNS);
  ipcMain.handle("set-dnf", setDNF);
};
