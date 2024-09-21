import { ipcMain, shell } from "electron";
import * as dbRunners from "../database/runners-db";
import { AppPaths } from "../lib/file-dialogs";
import { Handler } from "../types";

const exportRunnersFile: Handler<string> = () => {
  return dbRunners.exportRunnersAsCSV();
};

const exportIncrementalRunnersFile: Handler<string> = () => {
  return dbRunners.exportUnsentRunnersAsCSV();
};

const exportDNSFile: Handler<string> = () => {
  return dbRunners.exportDNSAsCSV();
};

const exportDNFFile: Handler<string> = () => {
  return dbRunners.exportDNFAsCSV();
};

const openExportDirectory = () => {
  shell.openPath(AppPaths.userRoot);
};

export const initExportHandlers = () => {
  ipcMain.handle("export-runners-file", exportRunnersFile);
  ipcMain.handle("export-incremental-file", exportIncrementalRunnersFile);
  ipcMain.handle("export-dns-file", exportDNSFile);
  ipcMain.handle("export-dnf-file", exportDNFFile);
  ipcMain.handle("open-export-dir", openExportDirectory);
};
