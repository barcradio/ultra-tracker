import { RfidSettings } from "$shared/models";
import { DeviceStatus } from "../../shared/enums";
import { GetWebContents } from "../lib/webContents";

export const hasReadRFID = () => {
  const webContents = GetWebContents();
  webContents?.send("read-rfid");
};

export const statusRFID = (status: DeviceStatus, message: string) => {
  const webContents = GetWebContents();
  webContents?.send("status-rfid", status, message);
};

export const settingsRfid = (settings: RfidSettings, message: string) => {
  const webContents = GetWebContents();
  webContents?.send("settings-rfid", settings, message);
};
