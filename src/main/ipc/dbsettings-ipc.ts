import path from "path";
import { ipcMain } from "electron";
import * as dbAthlete from "../database/athlete-db";
import { getDatabaseConnection } from "../database/connect-db";
import * as dbRunners from "../database/runners-db";
import * as dbStations from "../database/stations-db";
import * as dbStatus from "../database/status-db";
import * as dbTables from "../database/tables-db";
import * as dialogs from "../lib/file-dialogs";
import { appStore } from "../lib/store";
import { Handler } from "../types";

interface EventSetupFiles {
  athletes?: string;
  drops?: string;
}

const eventSetupFiles = new Map<number, EventSetupFiles>();

const loadStationFile: Handler<string> = () => {
  return dbStations.LoadStations();
};

const loadAthletesFile: Handler<string> = (event, args) => {
  console.log(`mainFrame URL: ${event.sender.mainFrame.url}`);
  console.log(args);
  return dbAthlete.LoadAthletes();
};

const loadDropsFile: Handler<string> = () => {
  return dbStatus.LoadDrops();
};

async function selectEventSetupFile(
  event: Electron.IpcMainInvokeEvent,
  type: keyof EventSetupFiles
): Promise<string | null> {
  const filePaths =
    type === "athletes" ? await dialogs.loadAthleteFile() : await dialogs.loadDropsFromCSV();
  const filePath = filePaths?.[0];
  if (!filePath) return null;

  const selectedFiles = eventSetupFiles.get(event.sender.id) ?? {};
  selectedFiles[type] = filePath;
  eventSetupFiles.set(event.sender.id, selectedFiles);
  return path.basename(filePath);
}

const selectEventAthletesFile: Handler<void, Promise<string | null>> = (event) => {
  return selectEventSetupFile(event, "athletes");
};

const selectEventDropsFile: Handler<void, Promise<string | null>> = (event) => {
  return selectEventSetupFile(event, "drops");
};

const importSelectedEventAthletesFile: Handler<void, Promise<string[]>> = async (event) => {
  const selectedFiles = eventSetupFiles.get(event.sender.id);
  if (!selectedFiles?.athletes) throw new Error("Select an athletes file before importing");

  return dbAthlete.LoadAthletesFromFile(selectedFiles.athletes);
};

const importSelectedEventDropsFile: Handler<void, Promise<string>> = async (event) => {
  const selectedFiles = eventSetupFiles.get(event.sender.id);
  if (!selectedFiles?.drops) throw new Error("Select a drops file before importing");

  return dbStatus.LoadDropsFromFile(selectedFiles.drops);
};

const importRunnersFile: Handler<string> = () => {
  return dbRunners.importRunnersFromCSV();
};

const initializeDatabase: Handler<string> = () => {
  return dbTables.CreateTables(getDatabaseConnection());
};

const clearDatabase: Handler<string> = () => {
  const result = dbTables.ClearTables(getDatabaseConnection());

  if (result === "Database tables cleared; Reinitialize or Restart!") {
    appStore.set("incrementalFileIndex", 1);
  }

  return result;
};

export const initdbSettingsHandlers = () => {
  ipcMain.handle("load-athletes-file", loadAthletesFile);
  ipcMain.handle("load-stations-file", loadStationFile);
  ipcMain.handle("load-drops-file", loadDropsFile);
  ipcMain.handle("select-event-athletes-file", selectEventAthletesFile);
  ipcMain.handle("select-event-drops-file", selectEventDropsFile);
  ipcMain.handle("import-selected-event-athletes-file", importSelectedEventAthletesFile);
  ipcMain.handle("import-selected-event-drops-file", importSelectedEventDropsFile);
  ipcMain.handle("import-runners-file", importRunnersFile);
  ipcMain.handle("initialize-database", initializeDatabase);
  ipcMain.handle("clear-database", clearDatabase);
};
