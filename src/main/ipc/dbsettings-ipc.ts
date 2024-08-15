import { ipcMain } from "electron";
import { AthleteDB } from "../../shared/models";
import * as dbAPI from "../database/main-db";
import { Handler } from "../types";

const getAthletesTable: Handler<AthleteDB[]> = () => {
  return dbAPI.AthletesLoadTable();
};

export const initdbSettingsHandlers = () => {
  ipcMain.handle("get-athletes-table", getAthletesTable);
};
