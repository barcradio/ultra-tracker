import { safeSend } from "../lib/webContents";
import { type OpenSplitTimeConnectionState } from "../services/opensplittime";

export const emitConnectionStatus = (status: OpenSplitTimeConnectionState) => {
  safeSend("status-opensplittime-connection", status);
};
