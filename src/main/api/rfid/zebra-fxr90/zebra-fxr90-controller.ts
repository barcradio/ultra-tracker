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
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectInProgress = false;
  private healthCheckInProgress = false;
  private consecutiveHealthCheckFailures = 0;
  private reconnectAttempts = 0;
  private manuallyDisconnected = false;
  private readonly healthCheckIntervalMs = 30000;
  private readonly maxHealthCheckFailures = 3;
  private readonly maxReconnectAttempts = 10;
  private readonly initialReconnectDelayMs = 5000;
  private readonly maxReconnectDelayMs = 60000;

  public on(event: RfidEvent, listener: Parameters<EventEmitter["on"]>[1]): void {
    this.eventEmitter.on(event, listener);
  }

  public async initialize(settings: RfidSettings): Promise<void> {
    this.manuallyDisconnected = false;
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
    await this.refreshScanningState();
    this.startHealthChecks();

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
    this.manuallyDisconnected = true;
    this.stopHealthChecks();
    this.clearReconnectTimer();
    this.scanning = false;
    this.rfidProcessor?.disconnect();
    await this.restClient?.stop();
  }

  public recover(): void {
    this.manuallyDisconnected = false;
    this.scanning = false;
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

  private async refreshScanningState(): Promise<void> {
    if (!this.restClient) throw new Error("RFID REST client is not initialized");
    this.scanning = (await this.restClient.getRadioActivity()) === "active";
  }

  private startHealthChecks(): void {
    this.stopHealthChecks();
    this.healthCheckTimer = setInterval(
      () => void this.checkReaderHealth(),
      this.healthCheckIntervalMs
    );
  }

  private stopHealthChecks(): void {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    this.healthCheckTimer = null;
    this.consecutiveHealthCheckFailures = 0;
  }

  private async checkReaderHealth(): Promise<void> {
    if (this.healthCheckInProgress || this.rfidSettings.status !== DeviceStatus.Connected) return;

    this.healthCheckInProgress = true;
    try {
      await this.refreshScanningState();
      this.consecutiveHealthCheckFailures = 0;
    } catch (error) {
      this.consecutiveHealthCheckFailures++;
      logRFID(
        LogLevel.warn,
        `RFID health check failed (${this.consecutiveHealthCheckFailures}/${this.maxHealthCheckFailures}):`,
        error
      );

      if (this.consecutiveHealthCheckFailures >= this.maxHealthCheckFailures) {
        this.handleError(new Error("RFID reader is offline after repeated health check failures"));
        this.rfidProcessor?.disconnect();
      }
    } finally {
      this.healthCheckInProgress = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.manuallyDisconnected || this.reconnectTimer || this.reconnectInProgress) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handleError(new Error("RFID reconnection failed after 10 attempts"));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.initialReconnectDelayMs * 2 ** (this.reconnectAttempts - 1),
      this.maxReconnectDelayMs
    );
    logRFID(LogLevel.warn, `RFID reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.reconnect();
    }, delay);
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectInProgress) return;

    this.reconnectInProgress = true;
    try {
      if (!this.restClient || !this.rfidProcessor) {
        throw new Error("RFID reader is not initialized");
      }
      if (!(await this.restClient.login())) {
        throw new Error(this.restClient.getLastError() ?? "RFID REST login failed");
      }

      await this.rfidProcessor.connect();
      await this.refreshScanningState();
      this.startHealthChecks();
      this.reconnectAttempts = 0;
    } catch (error) {
      logRFID(LogLevel.warn, "RFID reconnection failed:", error);
    } finally {
      this.reconnectInProgress = false;
      if (this.rfidSettings.status !== DeviceStatus.Connected) this.scheduleReconnect();
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.reconnectInProgress = false;
    this.reconnectAttempts = 0;
  }

  private onConnected(): void {
    this.rfidSettings.status = DeviceStatus.Connected;
    this.eventEmitter.emit("connected");
    rfidEmitter.statusRFID(DeviceStatus.Connected, "RFID reader connected");
  }

  private onDisconnected(): void {
    this.rfidSettings.status = DeviceStatus.Disconnected;
    this.scanning = false;
    this.stopHealthChecks();
    this.eventEmitter.emit("disconnected");
    rfidEmitter.statusRFID(DeviceStatus.Disconnected, "RFID reader disconnected");
    this.scheduleReconnect();
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
