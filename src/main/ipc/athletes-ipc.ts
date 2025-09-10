import { ipcMain } from "electron";
import { AthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import * as dbAthletes from "../database/athlete-db";
import { Handler } from "../types";

const getAthletesTable: Handler<DatabaseResponse<AthleteDB>> = () => {
  return dbAthletes.GetAthletes();
};

const getAthleteByBib: Handler<number, DatabaseResponse<AthleteDB>> = (_, bib) => {
  return dbAthletes.GetAthleteByBib(bib);
};

export const initAthleteHandlers = () => {
  ipcMain.handle("get-athletes-table", getAthletesTable);
  ipcMain.handle("get-athlete-by-bib", getAthleteByBib);
};
