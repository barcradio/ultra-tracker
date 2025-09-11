import EventEmitter from "events";
import { DeviceStatus, RfidMode } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import { RfidData } from "$shared/types";
import { RfidDataProcessor } from "./rfid-processor";
import { RfidRestClient } from "./rfid-rest-client";
import * as dbTimings from "../../../database/timingRecords-db";
import * as rfidEmitter from "../../../ipc/rfid-emitter";

import { IRfidController, RfidEvent } from "../interfaces/IRfid-controller";

export class RfidService implements IRfidController {
  private restClient?: RfidRestClient;
  private rfidProcessor?: RfidDataProcessor;
  private eventEmitter: EventEmitter = new EventEmitter();
  private rfidSettings!: RfidSettings;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;

  // NEW: expose event subscription
  public on(event: RfidEvent, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public connect(): void {
    if (this.rfidSettings?.status === DeviceStatus.Connected) {
      this.rfidProcessor?.connect();
    } else {
      console.error("Not connected to RFID (REST login not complete)");
    }
  }

  public async initialize(settings: RfidSettings): Promise<void> {
    this.rfidSettings = settings;
    this.restClient = new RfidRestClient(settings);
    this.rfidProcessor = new RfidDataProcessor(settings);
    this.rfidProcessor.on("tag-read", this.handleTagRead.bind(this));
    this.rfidProcessor.on("error", this.handleError.bind(this));
    this.rfidProcessor.on("connected", this.onWebSocketConnected.bind(this));
    this.rfidProcessor.on("disconnected", this.onWebSocketDisconnected.bind(this));

    const loginSuccess = await this.restClient.login();
    if (!loginSuccess) {
      this.eventEmitter.removeAllListeners();
      this.eventEmitter.emit("error", new Error("Login failed"));
      return;
    }

    this.rfidSettings.status = DeviceStatus.Connected;
    this.eventEmitter.emit("connected");
  }

  public startRFID(): void {
    if (this.rfidSettings.status === DeviceStatus.Connected) {
      this.rfidProcessor?.connect();
      this.restClient?.start();
    } else {
      console.error("Not connected to RFID");
    }
  }

  public stopRFID(): void {
    this.restClient?.stop();
    this.rfidProcessor?.disconnect();
    this.rfidSettings.mode = RfidMode.idle;
  }

  public setMode(mode: string): void {
    this.restClient?.setMode(mode);
  }

  public disconnect(): void {
    if (this.rfidSettings.status === DeviceStatus.Connected) {
      this.rfidSettings.status = DeviceStatus.Disconnected;
      this.rfidProcessor?.disconnect();
      this.eventEmitter.emit("disconnected");
    }
  }

  public getStatus(): DeviceStatus {
    return this.rfidSettings?.status || DeviceStatus.NoDevice;
  }

  public getSettings(): RfidSettings {
    return this.rfidSettings;
  }

  private onWebSocketConnected(): void {
    this.reconnectAttempts = 0;
    this.eventEmitter.emit("connected");
    this.rfidSettings.mode = RfidMode.active;
    this.restClient?.stop();
    this.restClient?.start();
  }

  private onWebSocketDisconnected(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnect attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.rfidProcessor?.connect(), this.reconnectInterval);
    } else {
      this.eventEmitter.emit("error", new Error("RFID WebSocket failed to reconnect"));
    }
  }

  private handleTagRead(obj: RfidData): void {
    const idhex = parseInt(obj.data.idHex);
    const timestamp = new Date(obj.timestamp);

    try {
      dbTimings.insertOrUpdateTimeRecord({
        index: -1,
        bibId: idhex,
        stationId: -1,
        timeIn: timestamp,
        timeOut: timestamp,
        timeModified: timestamp,
        note: "RFID",
        sent: false,
        status: -1
      });

      // UI ping (your existing side effect)
      rfidEmitter.hasReadRFID();

      // NEW: also emit tag event so controllers listening can react
      this.eventEmitter.emit("tag-read", obj);
    } catch (error) {
      console.error("Error updating database:", error);
      this.eventEmitter.emit("error", error as Error);
    }
  }

  private handleError(error: Error): void {
    this.eventEmitter.emit("error", error);
  }
}
