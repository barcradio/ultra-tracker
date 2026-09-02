import { ipcMain } from "electron";
import { DeviceStatus } from "$shared/enums";
import * as rfid from "../api/rfid-processor";
import { Handler } from "../types";

const startRFID: Handler<string> = () => {
  return rfid.InitializeRFIDReader();
};

const beginReadingRFID: Handler<string, Promise<string>> = () => {
  return rfid.StartRFIDReader();
};

const stopReadingRFID: Handler<string, Promise<string>> = () => {
  return rfid.StopRFIDReader();
};

const disconnectRFID: Handler<string, Promise<string>> = () => {
  return rfid.DisconnectRFIDReader();
};

const getStatusRFID: Handler<DeviceStatus> = () => {
  return rfid.GetRFIDStatus();
};

export const initRFIDHandlers = () => {
  ipcMain.handle("rfid-initialize", startRFID);
  ipcMain.handle("rfid-start-reading", beginReadingRFID);
  ipcMain.handle("rfid-stop-reading", stopReadingRFID);
  ipcMain.handle("rfid-disconnect", disconnectRFID);
  ipcMain.handle("rfid-get-status", getStatusRFID);
};
