import { ipcMain } from "electron";
import { DatabaseResponse } from "$shared/types";
import { RunnerDB, RunnerDBWithDNF } from "../../shared/models";
import * as dbRunners from "../database/runners-db";
import * as dbTimings from "../database/timingRecords-db";
import * as stats from "../lib/stat-engine";
import { Handler } from "../types";

interface GetRunnersTableOptions {
  includeDNF: boolean;
}

const getRunnersTable: Handler<
  GetRunnersTableOptions,
  DatabaseResponse<RunnerDBWithDNF[] | RunnerDB[]>
> = (_, options) => {
  const dataset = dbRunners.readRunnersTable(options);
  return dataset;
};

const addTimeRecord: Handler<RunnerDB, DatabaseResponse> = (_, record) => {
  const retValue = dbTimings.insertOrUpdateTimeRecord(record);
  const message = retValue[1];

  stats.Calculate();

  console.log(message);
  return retValue;
};

const deleteTimeRecord: Handler<RunnerDB, DatabaseResponse> = (_, record) => {
  const retValue = dbTimings.deleteTimeRecord(record);
  const message = retValue[1];

  stats.Calculate();

  console.log(message);
  return retValue;
};

export const initRunnerFormHandlers = () => {
  ipcMain.handle("get-runners-table", getRunnersTable);
  ipcMain.handle("add-timing-record", addTimeRecord);
  ipcMain.handle("edit-timing-record", addTimeRecord);
  ipcMain.handle("delete-timing-record", deleteTimeRecord);
};
