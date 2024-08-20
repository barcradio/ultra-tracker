import { ipcMain } from "electron";
import { AthleteDB } from "../../shared/models";
import * as dbAPI from "../database/main-db";
import { LoadStations } from "../database/stations-db";
import * as dbConnect from "../database/connect-db";
import * as dbRunners from "../database/runners-db";
import { Handler } from "../types";

const loadStationFile: Handler<string> = () => {
  return LoadStations();
};

const getAthletesTable: Handler<AthleteDB[]> = () => {
  return dbAPI.AthletesLoadTable();
};

const exportRunnersFile: Handler<string> = () => {
  return dbRunners.exportRunnersAsCSV();
};

const initializeDatabase: Handler<string> = () => {
  return dbConnect.CreateTables();
};

const clearDatabase: Handler<string> = () => {
  return dbConnect.ClearTables();
};

export const initdbSettingsHandlers = () => {
  ipcMain.handle("get-athletes-table", getAthletesTable);
  ipcMain.handle("load-stations-file", loadStationFile);
  ipcMain.handle("export-runners-file", exportRunnersFile);
  ipcMain.handle("initialize-database", initializeDatabase);
  ipcMain.handle("clear-database", clearDatabase);
};
