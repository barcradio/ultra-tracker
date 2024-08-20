import { ipcMain } from "electron";
import * as dbAthlete from "../database/athlete-db";
import * as dbConnect from "../database/connect-db";
import * as dbRunners from "../database/runners-db";
import * as dbStations from "../database/stations-db";
import { Handler } from "../types";

const loadStationFile: Handler<string> = () => {
  return dbStations.LoadStations();
};

const loadAthletesFile: Handler<string> = () => {
  return dbAthlete.LoadAthletes();
};

const getAthletesTable: Handler<string> = () => {
  return dbAthlete.LoadAthletes();
};

const importRunnersFile: Handler<string> = () => {
  return dbRunners.importRunnersFromCSV();
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
  ipcMain.handle("load-athletes-file", loadAthletesFile);
  ipcMain.handle("load-stations-file", loadStationFile);
  ipcMain.handle("import-runners-file", importRunnersFile);
  ipcMain.handle("export-runners-file", exportRunnersFile);
  ipcMain.handle("initialize-database", initializeDatabase);
  ipcMain.handle("clear-database", clearDatabase);
};
