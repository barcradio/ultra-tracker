/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import * as rfid from "../api/rfid-processor";
import { Handler } from "../types";

const startRFID: Handler<string> = () => {
  return rfid.InitializeRFIDReader();
};

export const initRFIDHandlers = () => {
  ipcMain.handle("initialize-rfid", startRFID);
};
