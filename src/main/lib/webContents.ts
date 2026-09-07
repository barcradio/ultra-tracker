import { BrowserWindow } from "electron";

export function GetWebContents() {
  return BrowserWindow.fromId(1)?.webContents;
}

export function reloadMainWindow(): void {
  GetWebContents()?.reload();
}
