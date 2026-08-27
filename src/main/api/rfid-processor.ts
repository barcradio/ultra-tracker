/*
/ RFID Web Sockets
// This is to interface with the ZEBRA FXR90 RFID scanner.  Currently Expects to receive Similar looking form the scanner"
 {"data":{"eventNum":5938,"format":"epc","idHex":"000000000000000000000343"},"timestamp":"2024-09-05T01:07:01.785-0600","type":"CUSTOM"}
/ where idhex is the the Bib number and the time stamp is the time when the bib was reed
/
/ USER APPS repo for Zebra https://github.com/ZebraDevs/RFID_ZIOTC_Examples
// Documentation: https://zebradevs.github.io/rfid-ziotc-docs/setupziotc/index.html#start-reads
*/

import { EventEmitter } from "events";
import WebSocket from "ws";
import { DatabaseStatus, DeviceStatus } from "../../shared/enums";
import * as dbRFIDInbox from "../database/rfidInbox-db";
import * as dbTimings from "../database/timingRecords-db";
import * as rfidEmitter from "../ipc/rfid-emitter";

let rfidWebSocketProcessor: RFIDWebSocketProcessor | null = null;
const rfidReaderUrl = "wss://fxr90c94e1c/ws:80"; //connecting directly via hostname

// Define interfaces to type the expected JSON data structure
interface RFIDData {
  eventNum: number;
  format: string;
  idHex: string;
}

interface RFIDMessage {
  data: RFIDData;
  timestamp: string;
  type: string;
}

type RFIDEventListener = Parameters<EventEmitter["on"]>[1];

export function InitializeRFIDReader() {
  const rfidRead = rfidEmitter.hasReadRFID;
  const rfidStatus = rfidEmitter.statusRFID;

  if (rfidWebSocketProcessor != null) {
    if (rfidWebSocketProcessor.getStatus() == DeviceStatus.Connected) {
      return "RFID Connected"; // static string
    }
  }

  try {
    rfidWebSocketProcessor = new RFIDWebSocketProcessor(rfidReaderUrl, rfidRead);
  } catch (e) {
    if (e instanceof Error) {
      console.error(`This RFID is broke: ${e.message}`);
      rfidStatus(DeviceStatus.Error, e.message);
    }
    return "RFID: Not Connected"; //static string
  }

  rfidWebSocketProcessor.on("connected", () => {
    console.log("RFID WebSocket connected");
    rfidStatus(DeviceStatus.Connected, "RFID Connected"); //Static string
  });

  rfidWebSocketProcessor.on("disconnected", () => {
    console.log("RFID WebSocket disconnected");
    rfidStatus(DeviceStatus.Disconnected, "RFID Disconnected"); //static string
  });

  rfidWebSocketProcessor.on("error", (error) => {
    console.error("RFID WebSocket error:", error);
  });

  rfidWebSocketProcessor.on("status", (...args: unknown[]) => {
    const [status, mess] = args as [DeviceStatus, string];

    rfidStatus(<DeviceStatus>status, mess);
  });

  return "Connecting RFID"; //static string
}

export function DisconnectRFIDReader() {
  if (rfidWebSocketProcessor != null) {
    rfidWebSocketProcessor.disconnect();
    rfidWebSocketProcessor = null; // makes sure it is closed before setting null;
  }
}

export function GetRFIDStatus(): DeviceStatus {
  if (rfidWebSocketProcessor != null) {
    return rfidWebSocketProcessor.getStatus();
  }
  return DeviceStatus.NoDevice;
}
export class RFIDWebSocketProcessor {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000; // milliseconds
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private eventEmitter: EventEmitter = new EventEmitter();
  private errorCount: number = 0;
  private processingPendingMessages: boolean = false;
  private pendingProcessingRequested: boolean = false;
  private pendingRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRetryAttempt: number = 0;
  private readonly initialRetryDelay = 1000;
  private readonly maxRetryDelay = 30000;
  private RFIRegex = /0{20}/;
  private url: string = "";
  private status: DeviceStatus = DeviceStatus.NoDevice;
  private dataBaseUpdated?: () => void;

  constructor(url: string, dataBaseUpdated?: () => void) {
    this.url = url;
    this.dataBaseUpdated = dataBaseUpdated;
    this.status = DeviceStatus.Connecting;
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.ws = new WebSocket(this.url, {
      rejectUnauthorized: false // Allow self-signed certificates
    });

    this.ws.on("open", () => {
      this.status = DeviceStatus.Connected;
      this.reconnectAttempts = 0;
      this.eventEmitter.emit("connected");
      this.requestProcessPendingMessages();
    });

    this.ws.on("message", (data) => {
      const payload = data.toString();
      console.debug("Received data:", payload);

      try {
        dbRFIDInbox.enqueue(payload);
        this.requestProcessPendingMessages();
      } catch (error) {
        console.error("Unable to persist RFID message:", error);
      }
    });

    this.ws.on("close", () => {
      console.log("Disconnected from RFID reader");
      //make sure they don't want to disconnect RFID
      if (this.status == DeviceStatus.Disconnecting) {
        this.status = DeviceStatus.Disconnected;
        this.eventEmitter.emit("disconnected");
      }
      if (this.status == DeviceStatus.Connected) {
        this.handleReconnection();
      }
    });

    this.ws.on("error", (error) => {
      this.errorCount++;
      console.error("WebSocket", error);

      if (error.toString().includes("EHOSTUNREACH") || error.toString().includes("ETIMEDOUT")) {
        //failed to find device
        switch (this.status) {
          case DeviceStatus.Connected:
            console.error("RFID host unreachable attempting to reconnect.");
            this.eventEmitter.emit("error", error);
            break;
          case DeviceStatus.Connecting:
            this.status = DeviceStatus.NoDevice;
            this.eventEmitter.emit("status", this.status, "No RFID Found");
            break;
          case DeviceStatus.NoDevice:
          case DeviceStatus.Disconnected:
          case DeviceStatus.Disconnecting:
          case DeviceStatus.Error:
            this.eventEmitter.emit("error", error);
        }
      }
      this.eventEmitter.emit("error", error);
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.setupWebSocket();
      }, this.reconnectInterval);
    } else {
      //called only if it was once connected and connection was never able to reconnect
      if (this.status == DeviceStatus.Connected) {
        this.eventEmitter.emit("error", "RFID Lost Connection max reconnection attempts reached"); //static string
      } else if (this.status == DeviceStatus.Connecting) {
        console.error("Max reconnection attempts reached. Unable connect to RFID");
      }
      this.status = DeviceStatus.NoDevice;
      this.eventEmitter.emit("status", this.status, "NO RFID Found");
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
      consumedLength += message.payload.length;
      if (consumedLength <= result.consumedLength) {
        dbRFIDInbox.markProcessed(message.index);
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
    console.warn(`Retrying pending RFID messages in ${delay}ms`);
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
    // Extract JSON objects from buffer
    const matches = [...payload.matchAll(/{.*?}(?=\{|\s*$)/g)];

    if (matches.length === 0) {
      console.log("No valid JSON objects found");
      return { consumedLength: 0, retryable: false };
    }

    let processedLength = 0;
    let retryable = false;
    // Process each parsed JSON object
    for (const match of matches) {
      const jsonStr = match[0];
      try {
        const obj = JSON.parse(jsonStr) as RFIDMessage;

        // Check if the RFID matches Bear 100 regex
        if (this.RFIRegex.test(obj.data.idHex)) {
          if (!this.handleDatabaseInsert(obj)) {
            retryable = true;
            break;
          }
        } else {
          console.log("Not Bear 100 regex");
        }
        processedLength = (match.index ?? 0) + jsonStr.length;
      } catch (error) {
        console.error("Failed to parse JSON:", error, "Raw JSON:", jsonStr);
        break;
      }
    }

    if (processedLength === payload.length || payload.slice(processedLength).trim() === "") {
      return { consumedLength: payload.length, retryable };
    }

    return { consumedLength: processedLength, retryable };
  }

  private handleDatabaseInsert(obj: RFIDMessage): boolean {
    const idhex = parseInt(obj.data.idHex);
    const timestamp = new Date(obj.timestamp);

    try {
      const [status] = dbTimings.insertOrUpdateTimeRecord({
        index: -1, // Set by backend
        bibId: idhex,
        stationId: -1, // Set by backend
        timeIn: timestamp,
        timeOut: timestamp,
        timeModified: timestamp,
        note: "RFID",
        sent: false, // Set by backend
        status: -1 // Set by backend
      });
      //console.log(`RFID processed: ${idhex}`);
      if (this.dataBaseUpdated) {
        this.dataBaseUpdated();
      }
      return status !== DatabaseStatus.Error;
    } catch (error) {
      console.error("Error updating database:", error);
      return false;
    }
  }

  public connect(addr: string) {
    this.url = "wss://" + addr + "/ws";
    this.handleReconnection();
  }

  public disconnect(): void {
    this.ws?.close(1000, "Client Closing Connection");
    this.status = DeviceStatus.Disconnecting;
  }

  public sendMessage(message: string): void {
    if (this.status == DeviceStatus.Connected) {
      this.ws?.send(message);
    }
    this.eventEmitter.emit("error", "RFID not Connected"); //static message
  }

  public getStatus(): DeviceStatus {
    return this.status;
  }

  public on(
    event: "connected" | "disconnected" | "error" | "status",
    listener: RFIDEventListener
  ): void {
    this.eventEmitter.on(event, listener);
  }
}
