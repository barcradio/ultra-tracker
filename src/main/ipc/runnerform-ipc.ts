/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import * as dbRunner from "../database/runners-db";

export const init = () => {
  ipcMain.handle("get-runners-table", async (_, dataset: Array<object>) => {
    dataset = dbRunner.ReadRunnersTable();
    return dataset;
  });

  ipcMain.on("on-update-runners-table", async (_, dataset: Array<object>) => {
    dataset = dbRunner.ReadRunnersTable();
    return dataset;
  });
};

export default {
  init
};
