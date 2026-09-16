import { BrowserWindow, type WebContents } from "electron";

export function GetWebContents() {
  return BrowserWindow.fromId(1)?.webContents;
}

export function reloadMainWindow(): void {
  GetWebContents()?.reload();
}

// Sends an IPC message to the main window, swallowing the race where the renderer's frame
// is disposed (window closing/reloading/app quitting) between the isDestroyed() check and the
// native send call, which Electron surfaces as a thrown "Render frame was disposed" error.
export function safeSend(channel: string, ...args: unknown[]): void {
  const webContents = GetWebContents();
  if (!webContents || webContents.isDestroyed()) return;

  try {
    (webContents as WebContents).send(channel, ...args);
  } catch {
    // Renderer frame was torn down between the check above and this call; nothing to notify.
  }
}
