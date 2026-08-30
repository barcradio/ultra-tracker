import EventEmitter from "events";
import { DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import { RfidData } from "$shared/types";
import * as dbTimings from "../../database/timingRecords-db";
import * as rfidEmitter from "../../ipc/rfid-emitter";
import { IRfidController, RfidEvent } from "./interfaces/IRfid-controller";
import { RfidDataProcessor } from "./web/rfid-processor";
import { RfidRestClient } from "./web/rfid-rest-client";

export class RfidService implements IRfidController {
  private restClient?: RfidRestClient;
  private rfidProcessor?: RfidDataProcessor;
  private eventEmitter: EventEmitter = new EventEmitter();
  private rfidSettings!: RfidSettings;
  private writeQueue: RfidData[] = [];
  private isWriting = false;
  private maxWriteRetries = 3;

  public on(event: RfidEvent, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public async initialize(settings: RfidSettings): Promise<void> {
    this.rfidSettings = settings;

    // Only initialize REST client if using REST API
    if (settings.type === "web") {
      this.restClient = new RfidRestClient(settings);
      const loginSuccess = await this.restClient.login();
      if (!loginSuccess) {
        this.eventEmitter.emit("error", new Error("RFID REST login failed"));
        throw new Error("RFID REST login failed");
      }
    }

    // Initialize the WebSocket processor
    this.rfidProcessor = new RfidDataProcessor(settings);
    this.rfidProcessor.on("tag-read", this.handleTagRead.bind(this));
    this.rfidProcessor.on("error", this.handleError.bind(this));
    this.rfidProcessor.on("connected", this.onConnected.bind(this));
    this.rfidProcessor.on("disconnected", this.onDisconnected.bind(this));

    this.rfidSettings.status = DeviceStatus.Connected;
    this.eventEmitter.emit("connected");
  }

  public connect(): void {
    if (this.rfidSettings?.status === DeviceStatus.Connected && this.rfidProcessor) {
      this.rfidProcessor.connect();
    } else {
      console.warn("Cannot connect: RFID not initialized or already disconnected");
    }
  }

  public disconnect(): void {
    if (this.rfidSettings?.status === DeviceStatus.Connected && this.rfidProcessor) {
      this.rfidSettings.status = DeviceStatus.Disconnected;
      this.rfidProcessor.disconnect();
      this.eventEmitter.emit("disconnected");
    }
  }

  public startRFID(): void {
    if (this.rfidSettings?.status === DeviceStatus.Connected) {
      this.rfidProcessor?.connect();
      this.restClient?.start();
    } else {
      console.warn("Cannot start RFID: reader not connected");
    }
  }

  public stopRFID(): void {
    this.restClient?.stop();
    this.rfidProcessor?.disconnect();
  }

  public setMode(mode: string): void {
    this.restClient?.setMode(mode);
  }

  public getStatus(): DeviceStatus {
    return this.rfidSettings?.status || DeviceStatus.NoDevice;
  }

  public getSettings(): RfidSettings {
    return this.rfidSettings;
  }

  private onConnected(): void {
    this.eventEmitter.emit("connected");
    rfidEmitter.statusRFID(DeviceStatus.Connected, "RFID reader connected");
  }

  private onDisconnected(): void {
    this.eventEmitter.emit("disconnected");
    rfidEmitter.statusRFID(DeviceStatus.Disconnected, "RFID reader disconnected");
  }

  private handleTagRead(data: RfidData): void {
    this.writeQueue.push(data);
    this.processWriteQueue();

    // Notify UI
    rfidEmitter.hasReadRFID();

    // Emit event for other subscribers
    this.eventEmitter.emit("tag-read", data);
  }

  private processWriteQueue(): void {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;
    const data = this.writeQueue.shift();

    if (!data) {
      this.isWriting = false;
      return;
    }

    this.writeTagToDatabase(data, 0);
  }

  private writeTagToDatabase(data: RfidData, attempt: number): void {
    const bibId = Number.parseInt(data.data.idHex, 10);
    const timestamp = new Date(data.timestamp);

    if (!Number.isFinite(bibId) || Number.isNaN(timestamp.getTime())) {
      console.error("Invalid RFID tag data:", data);
      this.isWriting = false;
      this.processWriteQueue();
      return;
    }

    try {
      dbTimings.insertOrUpdateTimeRecord({
        index: -1,
        bibId,
        stationId: -1,
        timeIn: timestamp,
        timeOut: timestamp,
        timeModified: timestamp,
        note: "RFID",
        sent: false,
        status: -1
      });

      this.isWriting = false;
      this.processWriteQueue();
    } catch (error) {
      if (attempt < this.maxWriteRetries) {
        console.warn(`RFID database write failed, retrying (${attempt + 1}/${this.maxWriteRetries}):`, error);
        setTimeout(() => this.writeTagToDatabase(data, attempt + 1), 100);
      } else {
        console.error("RFID database write failed after retries:", error);
        this.eventEmitter.emit("error", error as Error);
        this.isWriting = false;
        this.processWriteQueue();
      }
    }
  }

  private handleError(error: Error): void {
    console.error("RFID Service error:", error);
    this.eventEmitter.emit("error", error);
  }
}
