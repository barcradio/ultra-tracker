/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import { DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import * as runtime from "../runtime/rfid-runtime";

export function initRFIDHandlers() {
  // 1) Initialize (auth + connect), but DO NOT start scanning
  ipcMain.handle("rfid:initialize", async (_e, settings: RfidSettings) => {
    await runtime.initialize(settings);
    return { ok: true };
  });

  // 2) Start scanning
  ipcMain.handle("rfid:start", async () => {
    runtime.start();
    return { ok: true };
  });

  // 3) Stop scanning (stay connected)
  ipcMain.handle("rfid:stop", async () => {
    runtime.stop();
    return { ok: true };
  });

  // 4) Fully disconnect / teardown (used by UI or app shutdown)
  ipcMain.handle("rfid:disconnect", async () => {
    runtime.disconnect();
    return { ok: true };
  });

  // 5) Status query
  ipcMain.handle("rfid:getStatus", async (): Promise<DeviceStatus> => {
    return runtime.getStatus();
  });

  // 6) Optional: set mode while connected
  ipcMain.handle("rfid:setMode", async (_e, mode: string) => {
    runtime.setMode(mode);
    return { ok: true };
  });
}