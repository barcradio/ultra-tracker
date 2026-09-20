import { ipcMain } from "electron";
import { DeviceStatus } from "$shared/enums";
import { RfidConnectionSettings } from "$shared/models";
import * as rfid from "../api/rfid-processor";
import { Handler } from "../types";

function normalizeConnectionSettings(
  settings: Partial<RfidConnectionSettings> | undefined
): Partial<RfidConnectionSettings> {
  if (!settings) return {};

  const type = settings.type?.trim();
  const host = settings.restApiUrl?.trim();
  const webSocketHost = settings.webSocketUrl?.trim();
  const userName = settings.userName?.trim();
  const sslCert = settings.sslCert?.trim();

  if (type !== "zebra-fxr90") throw new Error("Unsupported RFID reader type.");
  if (!host || !webSocketHost || !userName || !settings.password || !sslCert) {
    throw new Error("RFID hostname, certificate serial, username, and password are required.");
  }
  if (!/^[a-zA-Z0-9.-]+$/.test(host) || !/^[a-zA-Z0-9.-]+$/.test(webSocketHost)) {
    throw new Error("RFID hostname or IP address contains unsupported characters.");
  }
  if (!/^[a-zA-Z0-9:-]+$/.test(sslCert)) {
    throw new Error("RFID certificate serial contains unsupported characters.");
  }

  return {
    type,
    restApiUrl: host,
    webSocketUrl: webSocketHost,
    userName,
    password: settings.password,
    sslCert
  };
}

const startRFID: Handler<Partial<RfidConnectionSettings>, Promise<string>> = (_, settings) => {
  return rfid.InitializeRFIDReader(normalizeConnectionSettings(settings));
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

const getScanningRFID: Handler<boolean> = () => {
  return rfid.IsRFIDScanning();
};

export const initRFIDHandlers = () => {
  ipcMain.handle("rfid-initialize", startRFID);
  ipcMain.handle("rfid-start-reading", beginReadingRFID);
  ipcMain.handle("rfid-stop-reading", stopReadingRFID);
  ipcMain.handle("rfid-disconnect", disconnectRFID);
  ipcMain.handle("rfid-get-status", getStatusRFID);
  ipcMain.handle("rfid-is-scanning", getScanningRFID);
};
