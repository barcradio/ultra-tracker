/*
  RFID Processor - Main entry point for RFID functionality
  Provides backward-compatible interface while using the extensible RfidService
*/

import { config } from "dotenv";
import { DeviceStatus } from "../../shared/enums";
import { RfidSettings } from "../../shared/models";
import { IRfidController } from "./rfid/interfaces/IRfid-controller";
import { RfidFactory } from "./rfid/rfid-reader-factory";
import * as rfidEmitter from "../ipc/rfid-emitter";

config({ path: "rfid.env" });

let rfidController: IRfidController | null = null;
const defaultRfidSettings: RfidSettings = {
  type: "web",
  restApiUrl: "fxr90c94e1c",
  webSocketUrl: "fxr90c94e1c",
  websocketPort: 80,
  secureWebsocket: true,
  userName: process.env.RFID_USERNAME ?? "",
  password: process.env.RFID_PASSWORD ?? "",
  sslCert: "5ecb6929",
  rfidTagRegx: /0{20}/,
  status: DeviceStatus.NoDevice,
  mode: 0 // RfidMode.idle
};

/**
 * Initialize RFID reader with default or provided settings
 */
export async function InitializeRFIDReader(settings?: Partial<RfidSettings>): Promise<string> {
  if (rfidController && rfidController.getStatus() === DeviceStatus.Connected) {
    return "RFID already connected";
  }

  try {
    const finalSettings = { ...defaultRfidSettings, ...settings };
    rfidController = RfidFactory.create(finalSettings);

    // Subscribe to controller events
    rfidController.on("connected", () => {
      rfidEmitter.statusRFID(DeviceStatus.Connected, "RFID Connected");
    });

    rfidController.on("disconnected", () => {
      rfidEmitter.statusRFID(DeviceStatus.Disconnected, "RFID Disconnected");
    });

    rfidController.on("error", (error) => {
      console.error("RFID error:", error);
      rfidEmitter.statusRFID(DeviceStatus.Error, error instanceof Error ? error.message : String(error));
    });

    rfidController.on("tag-read", () => {
      rfidEmitter.hasReadRFID();
    });

    // Initialize the reader
    await rfidController.initialize(finalSettings);

    return "RFID initializing";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to initialize RFID:", errorMessage);
    rfidEmitter.statusRFID(DeviceStatus.Error, errorMessage);
    return `RFID initialization failed: ${errorMessage}`;
  }
}

/**
 * Disconnect RFID reader
 */
export function DisconnectRFIDReader(): string {
  if (rfidController) {
    rfidController.disconnect();
    rfidController = null;
    return "RFID disconnected";
  }
  return "RFID was not connected";
}

/**
 * Start reading tags
 */
export function StartRFIDReader(): string {
  if (rfidController) {
    try {
      rfidController.startRFID();
      return "RFID reading started";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Failed to start RFID: ${errorMessage}`;
    }
  }
  return "RFID not initialized";
}

/**
 * Stop reading tags
 */
export function StopRFIDReader(): string {
  if (rfidController) {
    try {
      rfidController.stopRFID();
      return "RFID reading stopped";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Failed to stop RFID: ${errorMessage}`;
    }
  }
  return "RFID not initialized";
}

/**
 * Get current RFID status
 */
export function GetRFIDStatus(): DeviceStatus {
  if (rfidController) {
    return rfidController.getStatus();
  }
  return DeviceStatus.NoDevice;
}

/**
 * Get RFID settings
 */
export function GetRFIDSettings(): RfidSettings | null {
  if (rfidController) {
    return rfidController.getSettings();
  }
  return null;
}

/**
 * Set RFID mode (passed to REST API)
 */
export function SetRFIDMode(mode: string): string {
  if (rfidController) {
    try {
      rfidController.setMode(mode);
      return "RFID mode set";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Failed to set RFID mode: ${errorMessage}`;
    }
  }
  return "RFID not initialized";
}
