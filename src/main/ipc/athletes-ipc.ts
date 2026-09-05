import { ipcMain } from "electron";
import { AthleteDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { DatabaseStatus } from "$shared/enums";
import * as dbAthletes from "../database/athlete-db";
import * as dbWatchlist from "../database/watchlist-db";
import * as stats from "../lib/stat-engine";
import { Handler } from "../types";

const getAthletesTable: Handler<DatabaseResponse<AthleteDB>> = () => {
  return dbAthletes.GetAthletes();
};

const getAthleteByBib: Handler<number, DatabaseResponse<AthleteDB>> = (_, bib) => {
  return dbAthletes.GetAthleteByBib(bib);
};

const isValidBibId = (bibId: unknown): bibId is number =>
  typeof bibId === "number" && Number.isSafeInteger(bibId) && bibId > 0;

const toggleWatchlist: Handler<number, DatabaseResponse<boolean>> = (_, bibId) => {
  if (!isValidBibId(bibId)) return [null, DatabaseStatus.Error, "Invalid bib number"];

  const result = dbWatchlist.toggleWatchlist(bibId);
  stats.Calculate();
  return result;
};

const removeFromWatchlist: Handler<number, DatabaseResponse> = (_, bibId) => {
  if (!isValidBibId(bibId)) return [DatabaseStatus.Error, "Invalid bib number"];

  const result = dbWatchlist.removeFromWatchlist(bibId);
  stats.Calculate();
  return result;
};

export const initAthleteHandlers = () => {
  ipcMain.handle("get-athletes-table", getAthletesTable);
  ipcMain.handle("get-athlete-by-bib", getAthleteByBib);
  ipcMain.handle("toggle-watchlist", toggleWatchlist);
  ipcMain.handle("remove-from-watchlist", removeFromWatchlist);
};
