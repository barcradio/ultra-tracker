import EventEmitter from "events";
import { DatabaseStatus, DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import { RfidData } from "$shared/types";
import * as dbRFIDPendingWrites from "../../../database/rfidPendingWrites-db";
import * as dbTimings from "../../../database/timingRecords-db";
import * as rfidEmitter from "../../../ipc/rfid-emitter";
import { IRfidController, RfidEvent } from "../interfaces/IRfid-controller";
import { LogLevel, logRFID } from "../rfid-log";
import { ZebraWebSocketProcessor } from "./zebra-websocket-processor";
import { ZebraRestClient } from "./zebra-rest-client";

// Shared by the immediate write path and the durable retry sweep; throws so both can reuse retry/catch logic.
function writeTimeRecord(bibId: number, timestamp: Date): void {
  const [status, message] = dbTimings.insertOrUpdateTimeRecord({
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

  if (status === DatabaseStatus.Error) {
    throw new Error(message || "Unknown database error writing RFID timing record");
  }
}

export class ZebraFxr90Controller implements IRfidController {
  private restClient?: ZebraRestClient;
  private rfidProcessor?: ZebraWebSocketProcessor;
  private eventEmitter: EventEmitter = new EventEmitter();

  private rfidSettings!: RfidSettings;
  private writeQueue: RfidData[] = [];
  private isWriting = false;
  private maxWriteRetries = 3;
  private pendingWriteRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingWriteRetryAttempt = 0;
  private readonly initialPendingWriteRetryDelay = 1000;
  private readonly maxPendingWriteRetryDelay = 30000;

  public on(event: RfidEvent, listener: (...args: unknown[]) => void): void {
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

    this.rfidSettings.status = DeviceStatus.Connected;
    this.eventEmitter.emit("connected");

    // Recover any writes that were still pending when the app last closed/crashed
    this.processPendingWrites();
  }

  public connect(): void {
    if (this.rfidSettings?.status === DeviceStatus.Connected && this.rfidProcessor) {
      this.rfidProcessor.connect();
    } else {
      logRFID(LogLevel.warn, "Cannot connect: RFID not initialized or already disconnected");
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
      logRFID(LogLevel.warn, "Cannot start RFID: reader not connected");
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
      logRFID(LogLevel.error, "Invalid RFID tag data:", data);
      this.isWriting = false;
      this.processWriteQueue();
      return;
    }

    try {
      writeTimeRecord(bibId, timestamp);
      this.isWriting = false;
      this.processWriteQueue();
    } catch (error) {
      if (attempt < this.maxWriteRetries) {
        logRFID(
          LogLevel.warn,
          `RFID database write failed, retrying (${attempt + 1}/${this.maxWriteRetries}):`,
          error
        );
        setTimeout(() => this.writeTagToDatabase(data, attempt + 1), 100);
      } else {
        // Quick in-memory retries exhausted; persist so it survives a crash/restart
        // and gets swept up by processPendingWrites().
        logRFID(LogLevel.error, "RFID database write failed after retries, queuing durably:", error);
        dbRFIDPendingWrites.enqueue(bibId, timestamp.toISOString());
        this.eventEmitter.emit("error", error as Error);
        this.isWriting = false;
        this.processWriteQueue();
        this.schedulePendingWriteRetry();
      }
    }
  }

  // Sweeps durably-queued writes left over from write failures or a prior crash.
  private processPendingWrites(): void {
    const pending = dbRFIDPendingWrites.getPending();
    if (pending.length === 0) {
      this.resetPendingWriteRetry();
      return;
    }

    let allSucceeded = true;
    for (const record of pending) {
      try {
        writeTimeRecord(record.bibId, new Date(record.tagTimestamp));
        dbRFIDPendingWrites.markProcessed(record.index);
      } catch (error) {
        allSucceeded = false;
        const message = error instanceof Error ? error.message : String(error);
        dbRFIDPendingWrites.recordAttemptFailure(record.index, message);
      }
    }

    if (allSucceeded) {
      this.resetPendingWriteRetry();
    } else {
      this.schedulePendingWriteRetry();
    }
  }

  private schedulePendingWriteRetry(): void {
    if (this.pendingWriteRetryTimer) return;

    const delay = Math.min(
      this.initialPendingWriteRetryDelay * 2 ** this.pendingWriteRetryAttempt,
      this.maxPendingWriteRetryDelay
    );
    this.pendingWriteRetryAttempt++;
    logRFID(LogLevel.warn, `Retrying pending RFID database writes in ${delay}ms`);
    this.pendingWriteRetryTimer = setTimeout(() => {
      this.pendingWriteRetryTimer = null;
      this.processPendingWrites();
    }, delay);
  }

  private resetPendingWriteRetry(): void {
    if (this.pendingWriteRetryTimer) {
      clearTimeout(this.pendingWriteRetryTimer);
      this.pendingWriteRetryTimer = null;
    }
    this.pendingWriteRetryAttempt = 0;
  }


  private handleError(error: Error): void {
    logRFID(LogLevel.error, "RFID Service error:", error);
    this.eventEmitter.emit("error", error);
  }
}
