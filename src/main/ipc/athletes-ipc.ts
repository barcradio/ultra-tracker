import { ipcMain } from "electron";
import { AthleteDB } from "$shared/models";
import { GetAthletes } from "../database/athlete-db";
import { Handler } from "../types";

const getAthletesTable: Handler<AthleteDB> = () => {
  return GetAthletes();
};

export const initAthleteHandlers = () => {
  ipcMain.handle("get-athletes-table", getAthletesTable);
};
