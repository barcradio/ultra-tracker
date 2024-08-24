import { ipcMain } from "electron";
import * as stats from "../lib/stat-engine";
import { Handler } from "../types";

const calculateStats: Handler<{ any }> = () => {
  return stats.Calculate();
};

export const initStatsHandlers = () => {
  ipcMain.handle("stats-calculate", calculateStats);
};