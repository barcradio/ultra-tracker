import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge } from "electron";
import { data } from "./data";

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("data", data);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.data = data;
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
}
