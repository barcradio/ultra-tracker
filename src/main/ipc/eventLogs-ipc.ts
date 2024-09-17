import { ipcMain } from "electron";
import { EventLogRec } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import * as eventLogs from "../database/eventLogger-db";
import { Handler } from "../types";

const getEventLogs: Handler<boolean, DatabaseResponse<EventLogRec[]>> = (_, verbose) => {
  return eventLogs.getEventLogs(verbose);
};

export const initEventLogsHandlers = () => {
  ipcMain.handle("get-event-logs", getEventLogs);
};
