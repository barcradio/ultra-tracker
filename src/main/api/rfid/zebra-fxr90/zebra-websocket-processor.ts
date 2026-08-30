/*
  RFID Data Processor - WebSocket message handler
  Interfaces with the ZEBRA FXR90 RFID scanner via WebSocket
  Handles: message parsing, frame extraction, durability, retries
*/

import EventEmitter from "events";
import WebSocket from "ws";
import { DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import { RfidData } from "$shared/types";
import * as dbRFIDInbox from "../../../database/rfidInbox-db";
import { LogLevel, logRFID } from "../rfid-log";

type RfidProcessorEvents = {
  error: (error: Error) => void;
  "tag-read": (data: RfidData) => void;
  connected: () => void;
  disconnected: () => void;
};

interface RFIDFrame {
  start: number;
  end: number;
  payload: string;
}

function isRFIDMessage(value: unknown): value is RfidData {
  if (typeof value !== "object" || value === null) return false;

  const message = value as Partial<RfidData>;
  const data = message.data as Record<string, unknown> | undefined;

  return (
    data !== undefined &&
    data !== null &&
    typeof data === "object" &&
    typeof data.eventNum === "number" &&
    Number.isFinite(data.eventNum) &&
    data.format === "epc" &&
    typeof data.idHex === "string" &&
    /^0{20}\d+$/.test(data.idHex) &&
    typeof message.timestamp === "string" &&
    !Number.isNaN(Date.parse(message.timestamp)) &&
    message.type === "CUSTOM"
  );
}

function extractRFIDFrames(payload: string): { frames: RFIDFrame[]; incompleteStart?: number } {
  const frames: RFIDFrame[] = [];
  let searchStart = 0;

  while (searchStart < payload.length) {
    const start = payload.indexOf("{", searchStart);
    if (start === -1) break;

    let depth = 0;
    let escaped = false;
    let inString = false;

    for (let index = start; index < payload.length; index++) {
      const character = payload[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (inString && character === "\\") {
        escaped = true;
        continue;
      }

      if (character === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (character === "{") {
          depth++;
        } else if (character === "}") {
          depth--;
          if (depth === 0) {
            frames.push({
              start,
              end: index + 1,
              payload: payload.substring(start, index + 1)
            });
            searchStart = index + 1;
            break;
          }
        }
      }
    }

    if (depth > 0) {
      return { frames, incompleteStart: start };
    }
  }

  return { frames };
}

export class ZebraWebSocketProcessor {
  private ws: WebSocket | null = null;
  private url: string;
  private eventEmitter: EventEmitter = new EventEmitter();
  private status: DeviceStatus = DeviceStatus.NoDevice;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;
  private processingPendingMessages = false;
  private pendingProcessingRequested = false;
  private pendingRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRetryAttempt = 0;
  private readonly initialRetryDelay = 1000;
  private readonly maxRetryDelay = 30000;
  private rfidRegex: RegExp;

  constructor(settings: RfidSettings) {
    const protocol = settings.secureWebsocket ? "wss" : "ws";
    this.url = `${protocol}://${settings.webSocketUrl}:${settings.websocketPort}/ws`;
    this.rfidRegex = settings.rfidTagRegx || /0{20}/;
  }

  public connect(): void {
    this.status = DeviceStatus.Connecting;
    this.setupWebSocket();
  }

  public disconnect(): void {
    this.status = DeviceStatus.Disconnecting;
    this.ws?.close(1000, "Normal closure");
    this.ws = null;
  }

  public on<K extends keyof RfidProcessorEvents>(
    event: K,
    listener: RfidProcessorEvents[K]
  ): void {
    this.eventEmitter.on(event, listener);
  }

  private setupWebSocket(): void {
    this.ws = new WebSocket(this.url, { rejectUnauthorized: false });

    this.ws.on("open", () => {
      this.status = DeviceStatus.Connected;
      this.reconnectAttempts = 0;
      this.eventEmitter.emit("connected");
      this.requestProcessPendingMessages();
    });

    this.ws.on("message", (data) => {
      const payload = data.toString();
      logRFID(LogLevel.debug, "RFID message received:", payload.length, "bytes");

      try {
        dbRFIDInbox.enqueue(payload);
        this.requestProcessPendingMessages();
      } catch (error) {
        logRFID(LogLevel.error, "Unable to persist RFID message:", error);
      }
    });

    this.ws.on("close", () => {
      logRFID(LogLevel.info, "WebSocket disconnected");
      if (this.status === DeviceStatus.Disconnecting) {
        this.status = DeviceStatus.Disconnected;
        this.eventEmitter.emit("disconnected");
      } else if (this.status === DeviceStatus.Connected) {
        this.handleReconnection();
      }
    });

    this.ws.on("error", (error) => {
      logRFID(LogLevel.error, "WebSocket error:", error);

      if (error.toString().includes("EHOSTUNREACH") || error.toString().includes("ETIMEDOUT")) {
        switch (this.status) {
          case DeviceStatus.Connected:
            logRFID(LogLevel.error, "RFID host unreachable, attempting reconnection");
            this.eventEmitter.emit("error", error);
            break;
          case DeviceStatus.Connecting:
            this.status = DeviceStatus.NoDevice;
            this.eventEmitter.emit("error", new Error("RFID device not found"));
            break;
          default:
            this.eventEmitter.emit("error", error);
        }
      } else {
        this.eventEmitter.emit("error", error);
      }
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logRFID(LogLevel.warn, `RFID reconnection attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.setupWebSocket(), this.reconnectInterval);
    } else {
      this.status = DeviceStatus.NoDevice;
      logRFID(LogLevel.error, "RFID max reconnection attempts reached");
      this.eventEmitter.emit("error", new Error("RFID reconnection failed"));
    }
  }

  private processPendingMessages(): boolean {
    const pendingMessages = dbRFIDInbox.getPending();
    if (pendingMessages.length === 0) {
      this.resetPendingRetry();
      return false;
    }

    const payload = pendingMessages.map((message) => message.payload).join("");
    const result = this.processIncomingMessages(payload);
    let consumedLength = 0;

    for (const message of pendingMessages) {
      const messageStart = consumedLength;
      consumedLength += message.payload.length;
      if (consumedLength <= result.consumedLength) {
        dbRFIDInbox.markProcessed(message.index);
      } else if (messageStart < result.consumedLength) {
        dbRFIDInbox.replacePayload(
          message.index,
          message.payload.slice(result.consumedLength - messageStart)
        );
        break;
      }
    }

    if (result.retryable) {
      this.schedulePendingRetry();
    } else {
      this.resetPendingRetry();
    }

    return result.retryable;
  }

  private requestProcessPendingMessages(): void {
    this.pendingProcessingRequested = true;
    if (this.processingPendingMessages) return;

    this.processingPendingMessages = true;
    try {
      while (this.pendingProcessingRequested) {
        this.pendingProcessingRequested = false;
        if (this.processPendingMessages()) {
          this.pendingProcessingRequested = false;
        }
      }
    } finally {
      this.processingPendingMessages = false;
    }
  }

  private schedulePendingRetry(): void {
    if (this.pendingRetryTimer) return;

    const delay = Math.min(
      this.initialRetryDelay * 2 ** this.pendingRetryAttempt,
      this.maxRetryDelay
    );
    this.pendingRetryAttempt++;
    logRFID(LogLevel.warn, `Retrying pending RFID messages in ${delay}ms`);
    this.pendingRetryTimer = setTimeout(() => {
      this.pendingRetryTimer = null;
      this.requestProcessPendingMessages();
    }, delay);
  }

  private resetPendingRetry(): void {
    if (this.pendingRetryTimer) {
      clearTimeout(this.pendingRetryTimer);
      this.pendingRetryTimer = null;
    }
    this.pendingRetryAttempt = 0;
  }

  private processIncomingMessages(payload: string): {
    consumedLength: number;
    retryable: boolean;
  } {
    const { frames, incompleteStart } = extractRFIDFrames(payload);

    if (frames.length === 0) {
      if (incompleteStart !== undefined) return { consumedLength: 0, retryable: false };
      logRFID(LogLevel.debug, "No valid JSON frames found in payload");
      return { consumedLength: payload.length, retryable: false };
    }

    let processedLength = 0;
    let retryable = false;

    for (const frame of frames) {
      try {
        const obj = JSON.parse(frame.payload) as unknown;

        if (!isRFIDMessage(obj)) {
          logRFID(LogLevel.error, "Invalid RFID message structure:", frame.payload);
          this.eventEmitter.emit("error", new Error("Invalid RFID message structure"));
          processedLength = frame.end;
          continue;
        }

        if (!this.rfidRegex.test(obj.data.idHex)) {
          logRFID(LogLevel.debug, "RFID tag did not match configured pattern:", obj.data.idHex);
          processedLength = frame.end;
          continue;
        }

        this.eventEmitter.emit("tag-read", obj);
        processedLength = frame.end;
      } catch (error) {
        logRFID(LogLevel.error, "Failed to parse RFID JSON:", error, "Raw:", frame.payload);
        this.eventEmitter.emit("error", error as Error);
        retryable = true;
      }
    }

    return { consumedLength: processedLength, retryable };
  }
}
