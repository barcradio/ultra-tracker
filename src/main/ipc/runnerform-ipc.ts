/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import { RunnerDB } from "../../shared/models";
import * as dbRunner from "../database/runners-db";
import * as dbTimings from "../database/timingRecords-db";
import { Handler } from "../types";

const getRunnersTable: Handler<RunnerDB[]> = () => {
  return dbRunner.readRunnersTable();
};

const addTimeRecord: Handler<RunnerDB, string> = (_, record) => {
  const logMessage = dbTimings.insertOrUpdateTimeRecord(record);
  if (!logMessage) return "";
  console.log(logMessage);
  return logMessage;
};

export const initRunnerFormHandlers = () => {
  ipcMain.handle("get-runners-table", getRunnersTable);
  ipcMain.handle("add-timing-record", addTimeRecord);
  ipcMain.handle("edit-timing-record", addTimeRecord);
};
