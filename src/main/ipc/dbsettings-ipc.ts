import { ipcMain } from "electron";
import { DatabaseStatus, DropsImportConflictAction } from "$shared/enums";
import { ApplyDropsImportParams, DatabaseResponse, DropsImportPreview } from "$shared/types";
import * as dbAthlete from "../database/athlete-db";
import { getDatabaseConnection } from "../database/connect-db";
import { reloadEventArchiveFile } from "../database/event-archive-db";
import * as dbRunners from "../database/runners-db";
import * as dbStations from "../database/stations-db";
import * as dbStatus from "../database/status-db";
import * as dbTables from "../database/tables-db";
import { appStore } from "../lib/store";
import { Handler } from "../types";

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

const previewDropsFile: Handler<void, Promise<DatabaseResponse<DropsImportPreview>>> = async () => {
  const dropsFilePath = await dbStatus.SelectDropsFile();
  if (!dropsFilePath) {
    const response: DatabaseResponse<DropsImportPreview> = [
      null,
      DatabaseStatus.Error,
      "No drops file selected"
    ];
    return response;
  }

  return dbStatus.PreviewDropsFromFile(dropsFilePath);
};

const applyDropsImport: Handler<ApplyDropsImportParams> = (_event, params) => {
  if (!isApplyDropsImportParams(params)) {
    return [null, DatabaseStatus.Error, "Invalid drops import decision"];
  }

  return dbStatus.applyDropsImport(params);
};

const discardDropsImport: Handler<string> = (_event, importId) => {
  if (typeof importId !== "string") {
    return [DatabaseStatus.Error, "Invalid drops import ID"];
  }

  return dbStatus.discardDropsImport(importId);
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

const reloadEventsFile: Handler<string> = () => {
  return reloadEventArchiveFile();
};

export const initdbSettingsHandlers = () => {
  ipcMain.handle("load-athletes-file", loadAthletesFile);
  ipcMain.handle("load-stations-file", loadStationFile);
  ipcMain.handle("load-drops-file", loadDropsFile);
  ipcMain.handle("preview-drops-file", previewDropsFile);
  ipcMain.handle("apply-drops-import", applyDropsImport);
  ipcMain.handle("discard-drops-import", discardDropsImport);
  ipcMain.handle("import-runners-file", importRunnersFile);
  ipcMain.handle("initialize-database", initializeDatabase);
  ipcMain.handle("clear-database", clearDatabase);
  ipcMain.handle("reload-events-file", reloadEventsFile);
};

function isApplyDropsImportParams(value: unknown): value is ApplyDropsImportParams {
  if (typeof value !== "object" || value === null) return false;

  const params = value as Partial<ApplyDropsImportParams>;
  return (
    typeof params.importId === "string" &&
    Array.isArray(params.decisions) &&
    params.decisions.every(
      (decision) =>
        typeof decision === "object" &&
        decision !== null &&
        typeof decision.conflictId === "string" &&
        (decision.action === DropsImportConflictAction.PreserveExisting ||
          decision.action === DropsImportConflictAction.UseImported)
    )
  );
}
