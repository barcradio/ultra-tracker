import EventEmitter from "events";
import { DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import { RfidTagRead } from "$shared/types";
import { ZebraRestClient } from "./zebra-rest-client";
import { ZebraWebSocketProcessor } from "./zebra-websocket-processor";
import * as rfidEmitter from "../../../ipc/rfid-emitter";
import { IRfidController, RfidEvent } from "../interfaces/IRfid-controller";
import { LogLevel, logRFID } from "../rfid-log";
import { RfidTimingWriter } from "../rfid-timing-writer";

export class ZebraFxr90Controller implements IRfidController {
  private restClient?: ZebraRestClient;
  private rfidProcessor?: ZebraWebSocketProcessor;
  private eventEmitter: EventEmitter = new EventEmitter();
  private timingWriter = new RfidTimingWriter();
  private rfidSettings!: RfidSettings;
  private scanning = false;

  public on(event: RfidEvent, listener: Parameters<EventEmitter["on"]>[1]): void {
    this.eventEmitter.on(event, listener);
  }

  public async initialize(settings: RfidSettings): Promise<void> {
    this.rfidSettings = settings;

    // Only initialize REST client if using REST API
    if (settings.type === "zebra-fxr90") {
      this.restClient = new ZebraRestClient(settings);
      const loginSuccess = await this.restClient.login();
      if (!loginSuccess) {
        const detail = this.restClient.getLastError() ?? "unknown error";
        // Don't also emit "error" here - the caller logs the thrown error already.
        throw new Error(`RFID REST login failed: ${detail}`);
      }
    }

    // Initialize the WebSocket processor
    this.rfidProcessor = new ZebraWebSocketProcessor(settings);
    this.rfidProcessor.on("tag-read", this.handleTagRead.bind(this));
    this.rfidProcessor.on("error", this.handleError.bind(this));
    this.rfidProcessor.on("connected", this.onConnected.bind(this));
    this.rfidProcessor.on("disconnected", this.onDisconnected.bind(this));

    this.rfidSettings.status = DeviceStatus.Connecting;
    await this.rfidProcessor.connect();

    this.timingWriter.recoverPendingWrites();
  }

  public connect(): void {
    if (this.rfidSettings?.status === DeviceStatus.Connected && this.rfidProcessor) {
      void this.rfidProcessor.connect().catch(this.handleError.bind(this));
    } else {
      logRFID(LogLevel.warn, "Cannot connect: RFID not initialized or already disconnected");
    }
  }

  public async disconnect(): Promise<void> {
    await this.stopRFID();
    this.rfidProcessor?.disconnect();
  }

  public async startRFID(): Promise<void> {
    if (this.rfidProcessor) {
      await this.rfidProcessor.connect();
      await this.restClient?.start();
      this.scanning = true;
    } else {
      throw new Error("Cannot start RFID: reader not initialized");
    }
  }

  public async stopRFID(): Promise<void> {
    await this.restClient?.stop();
    this.scanning = false;
  }

  public isScanning(): boolean {
    return this.scanning;
  }

  public setMode(mode: string): void {
    this.restClient?.setMode(mode);
  }

  public getStatus(): DeviceStatus {
    return this.rfidSettings?.status ?? DeviceStatus.NoDevice;
  }

  public getSettings(): RfidSettings {
    return this.rfidSettings;
  }

  private onConnected(): void {
    this.rfidSettings.status = DeviceStatus.Connected;
    this.eventEmitter.emit("connected");
    rfidEmitter.statusRFID(DeviceStatus.Connected, "RFID reader connected");
  }

  private onDisconnected(): void {
    this.rfidSettings.status = DeviceStatus.Disconnected;
    this.eventEmitter.emit("disconnected");
    rfidEmitter.statusRFID(DeviceStatus.Disconnected, "RFID reader disconnected");
  }

  private handleTagRead(tagRead: RfidTagRead): void {
    this.timingWriter.write(tagRead);
    rfidEmitter.hasReadRFID();
    this.eventEmitter.emit("tag-read", tagRead);
  }

  private handleError(error: Error): void {
    logRFID(LogLevel.error, "RFID Service error:", error);
    this.eventEmitter.emit("error", error);
  }
}
