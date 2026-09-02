/*
  RFID Processor - Main entry point for RFID functionality
  Provides a reader-agnostic interface; RfidFactory picks the concrete
  controller (e.g. ZebraFxr90Controller) based on settings.type.
*/

import { config } from "dotenv";
import { IRfidController } from "./rfid/interfaces/IRfid-controller";
import { LogLevel, logRFID } from "./rfid/rfid-log";
import { RfidFactory } from "./rfid/rfid-reader-factory";
import { DeviceStatus } from "../../shared/enums";
import { RfidSettings } from "../../shared/models";
import * as rfidEmitter from "../ipc/rfid-emitter";

config({ path: "rfid.env" });

let rfidController: IRfidController | null = null;
const defaultRfidSettings: RfidSettings = {
  type: "zebra-fxr90",
  restApiUrl: "fxr90c94e1c",
  webSocketUrl: "fxr90c94e1c",
  websocketPort: 443,
  secureWebsocket: true,
  userName: process.env.RFID_USERNAME ?? "",
  password: process.env.RFID_PASSWORD ?? "",
  sslCert: "5ecb6929",
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
      logRFID(LogLevel.error, "RFID error:", error);
      rfidEmitter.statusRFID(
        DeviceStatus.Error,
        error instanceof Error ? error.message : String(error)
      );
    });

    rfidController.on("tag-read", () => {
      rfidEmitter.hasReadRFID();
    });

    // Initialize the reader
    await rfidController.initialize(finalSettings);

    return "RFID initializing";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logRFID(LogLevel.error, "Failed to initialize RFID:", errorMessage);
    rfidEmitter.statusRFID(DeviceStatus.Error, errorMessage);
    return `RFID initialization failed: ${errorMessage}`;
  }
}

/**
 * Disconnect RFID reader
 */
export async function DisconnectRFIDReader(): Promise<string> {
  if (rfidController) {
    try {
      await rfidController.disconnect();
      rfidController = null;
      return "RFID reader stopped and disconnected";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Failed to stop RFID reader before disconnecting: ${errorMessage}`;
    }
  }
  return "RFID was not connected";
}

/**
 * Start reading tags
 */
export async function StartRFIDReader(): Promise<string> {
  if (rfidController) {
    try {
      await rfidController.startRFID();
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
export async function StopRFIDReader(): Promise<string> {
  if (rfidController) {
    try {
      await rfidController.stopRFID();
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
