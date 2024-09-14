import { GetWebContents } from "../lib/webContents";

export const hasReadRFID = () => {
  const webContents = GetWebContents();
  webContents?.send("read-rfid");
};
