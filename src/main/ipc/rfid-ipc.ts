/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import { DeviceStatus } from "$shared/enums";
import * as rfid from "../api/rfid-processor";
import { Handler } from "../types";

const startRFID: Handler<string> = () => {
  return rfid.InitializeRFIDReader();
};

const disconnectRFID: Handler<string> = () => {
  rfid.DisconnectRFIDReader();
  return "RFID Disconnected";
};

const getStatusRFID: Handler<DeviceStatus> = () => {
  return rfid.GetRFIDStatus();
};

export const initRFIDHandlers = () => {
  ipcMain.handle("rfid-initialize", startRFID);
  ipcMain.handle("rfid-disconnect", disconnectRFID);
  ipcMain.handle("rfid-get-status", getStatusRFID);
};
