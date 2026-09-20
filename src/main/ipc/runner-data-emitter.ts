import { safeSend } from "../lib/webContents";

// Notifies the renderer that runner data changed outside of a direct IPC response, e.g. a
// background OST push completing after the edit/insert that triggered it already returned.
export const emitRunnersTableChanged = () => {
  safeSend("runners-table-changed");
};
