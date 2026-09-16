import { DeviceStatus } from "../../shared/enums";
import { safeSend } from "../lib/webContents";

export const hasReadRFID = () => {
  safeSend("read-rfid");
};

export const statusRFID = (status: DeviceStatus, message: string) => {
  safeSend("status-rfid", status, message);
};
