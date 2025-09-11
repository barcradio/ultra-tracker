// AFTER: (adds events + aligns imports with $shared)
import { DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";

export type RfidEvent = "tag-read" | "error" | "connected" | "disconnected";

export interface IRfidController {
  initialize(settings: RfidSettings): Promise<void>;
  connect(): void;
  disconnect(): void;
  startRFID(): void;
  stopRFID(): void;
  setMode(mode: string): void;
  getStatus(): DeviceStatus;
  getSettings(): RfidSettings;

  // NEW: let consumers subscribe to controller events
  on(event: RfidEvent, listener: (...args: unknown[]) => void): void;
}
