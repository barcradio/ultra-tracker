import { GetWebContents } from "../lib/webContents";
import { type OpenSplitTimeConnectionState } from "../services/opensplittime";

export const emitConnectionStatus = (status: OpenSplitTimeConnectionState) => {
  const webContents = GetWebContents();
  webContents?.send("status-opensplittime-connection", status);
};
