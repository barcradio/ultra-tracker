import { ipcMain } from "electron";

export const hasReadRFID = () => {
  ipcMain.emit("read-rfid");
};
