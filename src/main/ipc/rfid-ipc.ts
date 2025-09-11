import { ipcMain } from "electron";
import { DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import { RfidController } from "../api/rfid/rfid-controller";

export function initRFIDHandlers() {
  // 1) Initialize (auth + connect), but DO NOT start scanning
  ipcMain.handle("rfid:initialize", async (_e, settings: RfidSettings) => {
    try {
      await RfidController.getInstance().initialize(settings);
    } catch {
      return "Failed to connect to RFID reader";
    }

    const status = RfidController.getInstance().getSettings()?.status;
    if (status !== DeviceStatus.Connected) {
      return "Failed to connect to RFID reader"; // <- triggers red toast
    }
    return "Connected";
  });
  // 2) Start scanning
  ipcMain.handle("rfid:start", async () => {
    RfidController.getInstance().start();
    return { ok: true };
  });

  // 3) Stop scanning (stay connected)
  ipcMain.handle("rfid:stop", async () => {
    RfidController.getInstance().stop();
    return { ok: true };
  });

  // 4) Fully disconnect / teardown (used by UI or app shutdown)
  ipcMain.handle("rfid:disconnect", async () => {
    RfidController.getInstance().disconnect();
    return { ok: true };
  });

  // 5) Status query
  ipcMain.handle("rfid:getStatus", async (): Promise<DeviceStatus> => {
    return RfidController.getInstance().getStatus();
  });

  // 6) Optional: set mode while connected
  ipcMain.handle("rfid:setMode", async (_e, mode: string) => {
    RfidController.getInstance().setMode(mode);
    return { ok: true };
  });

  ipcMain.handle("rfid:getSettings", async (): Promise<RfidSettings | null | undefined> => {
    return RfidController.getInstance().getSettings();
  });
}
