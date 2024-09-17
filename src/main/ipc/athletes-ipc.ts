import { ipcMain } from "electron";
import { AthleteDB, RunnerAthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import * as dbAthletes from "../database/athlete-db";
import { Handler } from "../types";

const getAthletesTable: Handler<DatabaseResponse<AthleteDB>> = () => {
  return dbAthletes.GetAthletes();
};

const getAthleteByBib: Handler<number, DatabaseResponse<AthleteDB>> = (_, bib) => {
  return dbAthletes.GetAthleteByBib(bib);
};

const setAthleteDNS: Handler<RunnerAthleteDB> = (_, data) => {
  return dbAthletes.SetDNSOnAthlete(data.bibId, data.dns!);
};

const setAthleteDNF: Handler<RunnerAthleteDB> = (_, data) => {
  return dbAthletes.SetDNFOnAthlete(data.bibId, data.timeOut, data.dnf!, data.dnfType!);
};

export const initAthleteHandlers = () => {
  ipcMain.handle("get-athletes-table", getAthletesTable);
  ipcMain.handle("get-athlete-by-bib", getAthleteByBib);
  ipcMain.handle("set-athlete-dns", setAthleteDNS);
  ipcMain.handle("set-athlete-dnf", setAthleteDNF);
};
