import { ipcMain } from "electron";
import { AthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { GetAthleteByBib, GetAthletes } from "../database/athlete-db";
import { Handler } from "../types";

const getAthletesTable: Handler<AthleteDB> = () => {
  return GetAthletes();
};

const getAthleteByBib: Handler<number, DatabaseResponse<AthleteDB>> = (_, bib) => {
  return GetAthleteByBib(bib);
};

export const initAthleteHandlers = () => {
  ipcMain.handle("get-athletes-table", getAthletesTable);
  ipcMain.handle("get-athlete-by-bib", getAthleteByBib);
};
