import { ipcMain } from "electron";
import { AthleteDB } from "../../shared/models";
import * as dbAPI from "../database/main-db";
import { LoadStations } from "../database/stations-db";
import { Handler } from "../types";

const loadStationFile: Handler<string> = () => {
  return LoadStations();
};

const getAthletesTable: Handler<AthleteDB[]> = () => {
  return dbAPI.AthletesLoadTable();
};

export const initdbSettingsHandlers = () => {
  ipcMain.handle("get-athletes-table", getAthletesTable);
  ipcMain.handle("load-stations-file", loadStationFile);
};
