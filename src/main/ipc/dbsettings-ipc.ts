import { ipcMain } from "electron";
import * as dbAthlete from "../database/athlete-db";
import * as dbRunners from "../database/runners-db";
import * as dbStations from "../database/stations-db";
import * as dbTables from "../database/tables-db";
import { Handler } from "../types";

const loadStationFile: Handler<string> = () => {
  return dbStations.LoadStations();
};

const loadAthletesFile: Handler<string> = (event, args) => {
  console.log(`mainFrame URL: ${event.sender.mainFrame.url}`);
  console.log(args);
  return dbAthlete.LoadAthletes();
};

const loadDNSFile: Handler<string> = () => {
  return dbAthlete.LoadDNS();
};

const loadDNFFile: Handler<string> = () => {
  return dbAthlete.LoadDNF();
};

const importRunnersFile: Handler<string> = () => {
  return dbRunners.importRunnersFromCSV();
};

const initializeDatabase: Handler<string> = () => {
  return dbTables.CreateTables();
};

const clearDatabase: Handler<string> = () => {
  return dbTables.ClearTables();
};

export const initdbSettingsHandlers = () => {
  ipcMain.handle("load-athletes-file", loadAthletesFile);
  ipcMain.handle("load-stations-file", loadStationFile);
  ipcMain.handle("load-dns-file", loadDNSFile);
  ipcMain.handle("load-dnf-file", loadDNFFile);
  ipcMain.handle("import-runners-file", importRunnersFile);
  ipcMain.handle("initialize-database", initializeDatabase);
  ipcMain.handle("clear-database", clearDatabase);
};
