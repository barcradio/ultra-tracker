/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import { RunnerDB, TimingRecord } from "../../shared/models";
import * as dbRunner from "../database/runners-db";
import * as dbTimings from "../database/timingRecordsDb";
import { Handler } from "../types";

const getRunnersTable: Handler<RunnerDB[]> = () => {
  return dbRunner.readRunnersTable();
};

const addTimingRecord: Handler<TimingRecord, string> = (_, record) => {
  const logMessage = dbTimings.insertOrUpdateTimingRecord(record);
  if (!logMessage) return "";
  console.log(logMessage);
  return logMessage;
};

export const initRunnerFormHandlers = () => {
  ipcMain.handle("get-runners-table", getRunnersTable);
  ipcMain.handle("add-timing-record", addTimingRecord);
  ipcMain.handle("edit-timing-record", addTimingRecord);
};
