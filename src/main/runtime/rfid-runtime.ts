// main/api/runtime/rfid-runtime.ts
import { DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import { IRfidController } from "../api/rfid/interfaces/IRfid-controller";
import { RfidFactory } from "../api/rfid/rfid-reader-factory";

let instance: IRfidController | null = null;

/** Initialize (and connect) the reader with UI-provided settings, but DO NOT start scanning. */
export async function initialize(settings: RfidSettings): Promise<void> {
  // If a reader is already active, fully dispose it first
  if (instance) {
    try {
      instance.stopRFID();
      instance.disconnect();
    } catch {
      /* noop */
    }
    instance = null;
  }

  const controller = RfidFactory.create(settings);

  // Let the controller do auth/config prep
  await controller.initialize(settings);

  // Open underlying connections (e.g., WebSocket/serial), still not scanning
  controller.connect();

  instance = controller;
}

/** Start scanning (assumes initialize() + connect() already ran). */
export function start(): void {
  instance?.startRFID();
}

/** Stop scanning but keep the connection alive. */
export function stop(): void {
  instance?.stopRFID();
}

/** Fully disconnect and clear the singleton (use on shutdown). */
export function disconnect(): void {
  if (!instance) return;
  try {
    instance.stopRFID();
    instance.disconnect();
  } finally {
    instance = null;
  }
}

export function getStatus(): DeviceStatus {
  return instance ? instance.getStatus() : DeviceStatus.NoDevice;
}

export function setMode(mode: string): void {
  instance?.setMode(mode);
}

/** Optional: subscribe to live events from the active controller. */
export function on(
  event: "tag-read" | "error" | "connected" | "disconnected",
  listener: (...args: unknown[]) => void
): void {
  instance?.on(event, listener);
}
