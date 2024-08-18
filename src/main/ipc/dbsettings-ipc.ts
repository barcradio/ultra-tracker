import { ipcMain } from "electron";
import { AthleteDB } from "../../shared/models";
import * as dbAPI from "../database/main-db";
import { exportRunnersAsCSV } from "../database/runners-db";
import { LoadStations } from "../database/stations-db";
import { Handler } from "../types";

const loadStationFile: Handler<string> = () => {
  return LoadStations();
};

const getAthletesTable: Handler<AthleteDB[]> = () => {
  return dbAPI.AthletesLoadTable();
};

const exportRunnersFile: Handler<string> = () => {
  return exportRunnersAsCSV();
};

export const initdbSettingsHandlers = () => {
  ipcMain.handle("get-athletes-table", getAthletesTable);
  ipcMain.handle("load-stations-file", loadStationFile);
  ipcMain.handle("export-runners-file", exportRunnersFile);
};
