import { ipcMain } from "electron";
import { DatabaseResponse } from "$shared/types";
import { RunnerDB } from "../../shared/models";
import * as dbRunners from "../database/runners-db";
import * as dbTimings from "../database/timingRecords-db";
import * as stats from "../lib/stat-engine";
import { getOpenSplitTimePushStatus } from "../services/opensplittime";
import { Handler } from "../types";

interface GetRunnersTableOptions {
  includeDrops: boolean;
}

const getRunnersTable: Handler<GetRunnersTableOptions, DatabaseResponse<RunnerDB[]>> = (
  _,
  options
) => {
  const dataset = dbRunners.readRunnersTable(options);
  const [runners] = dataset;

  runners?.forEach((runner) => {
    const pushState = getOpenSplitTimePushStatus(runner.bibId);
    runner.openSplitTimePushStatus = pushState?.status;
    runner.openSplitTimePushError = pushState?.error;
  });

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

interface CheckDuplicateParams {
  bibId: number;
  index: number;
}

const checkIfBibIsDuplicate: Handler<CheckDuplicateParams, DatabaseResponse<boolean>> = (
  _,
  params
) => {
  const retValue = dbTimings.isBibDuplicate(params.bibId, params.index);

  console.log(retValue[0]);
  return retValue;
};

export const initRunnerFormHandlers = () => {
  ipcMain.handle("get-runners-table", getRunnersTable);
  ipcMain.handle("add-timing-record", addTimeRecord);
  ipcMain.handle("edit-timing-record", addTimeRecord);
  ipcMain.handle("delete-timing-record", deleteTimeRecord);
  ipcMain.handle("is-duplicate-bib", checkIfBibIsDuplicate);
};
