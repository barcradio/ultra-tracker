/* eslint-disable no-unused-vars */

import { DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import type EventEmitter from "events";

export type RfidEvent = "tag-read" | "error" | "connected" | "disconnected";

export interface IRfidController {
  initialize(settings: RfidSettings): Promise<void>;
  connect(): void;
  disconnect(): Promise<void>;
  startRFID(): Promise<void>;
  stopRFID(): Promise<void>;
  isScanning(): boolean;
  setMode(mode: string): void;
  getStatus(): DeviceStatus;
  getSettings(): RfidSettings;

  // Let consumers subscribe to controller events
  on(event: RfidEvent, listener: Parameters<EventEmitter["on"]>[1]): void;
}
