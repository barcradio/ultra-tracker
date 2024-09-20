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
import { RFIDReaderStatus } from "../../shared/enums";
import * as dbTimings from "../database/timingRecords-db";
import * as rfidEmitter from "../ipc/rfid-emitter";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let rfidWebSocketProcessor: RFIDWebSocketProcessor | null = null;
const rfidReaderUrl = "wss://169.254.78.28/ws:80"; //trying to connect via host name.

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

export function InitializeRFIDReader() {
  const rfidRead = rfidEmitter.hasReadRFID;
  const rfidStatus = rfidEmitter.statusRFID;

  if (rfidWebSocketProcessor != null) {
    return "RFID Connected"; // static string
  }

  try {
    rfidWebSocketProcessor = new RFIDWebSocketProcessor(rfidReaderUrl, rfidRead);
  } catch (e) {
    if (e instanceof Error) {
      console.error(`This RFID is broke: ${e.message}`);
      rfidStatus(RFIDReaderStatus.Error, e.message);
    }
    return "RFID: Not Connected"; //static string
  }

  if (!rfidWebSocketProcessor) return; //TODO: return state to client

  rfidWebSocketProcessor.on("connected", () => {
    console.log("RFID WebSocket connected");
    rfidStatus(RFIDReaderStatus.Connected, "RFID Connected"); //Static string
  });

  rfidWebSocketProcessor.on("disconnected", () => {
    console.log("RFID WebSocket disconnected");
    rfidStatus(RFIDReaderStatus.Disconnected, "RFID Disconnected"); //static string
  });

  rfidWebSocketProcessor.on("error", (error) => {
    console.error("RFID WebSocket error:", error);
  });

  //TODO: return state to client
  return "Connecting RFID"; //static string
}

export function DisconnectRFIDReader() {
  if (rfidWebSocketProcessor) {
    rfidWebSocketProcessor.disconnect();
    rfidWebSocketProcessor = null;
  }
}

export class RFIDWebSocketProcessor {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000; // milliseconds
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private eventEmitter: EventEmitter = new EventEmitter();
  private errorCount: number = 0;
  private buffer: string = "";
  private RFIRegex = /0{20}/;
  private url: string = "";
  private status: RFIDReaderStatus = RFIDReaderStatus.NoDevice; // or no device?
  // runner info queue

  constructor(
    url: string,
    private dataBaseUpdated?: () => void
  ) {
    this.status = RFIDReaderStatus.NoDevice; // or no device?
    this.url = url;
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.ws = new WebSocket(this.url, {
      rejectUnauthorized: false // Allow self-signed certificates
    });

    this.ws.on("open", () => {
      this.status = RFIDReaderStatus.Connected;
      this.reconnectAttempts = 0;
      this.eventEmitter.emit("connected");
    });

    this.ws.on("message", (data) => {
      this.buffer += data.toString();
      //console.debug("Received data:", data.toString());
      this.processIncomingMessages();
    });

    this.ws.on("close", () => {
      console.log("Disconnected from RFID reader");
      this.handleReconnection();
    });

    this.ws.on("error", (error) => {
      this.errorCount++;
      console.error("WebSocket error:", error);
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
      console.error("Max reconnection attempts reached.");

      //called only if it was once connected and connection was never able to reconnect
      if (this.status == RFIDReaderStatus.Connected) {
        this.eventEmitter.emit("error", "Lost Connection With RFID"); //static string
      }
      this.status = RFIDReaderStatus.NoDevice;
      this.eventEmitter.emit("error", "Max reconnection attempts reached"); //static string
    }
  }

  private processIncomingMessages(): void {
    // Extract JSON objects from buffer
    const jsonObjects = this.buffer.match(/{.*?}(?=\{|\s*$)/g);

    if (!jsonObjects) {
      console.log("No valid JSON objects found");
      return;
    }

    // Process each parsed JSON object
    jsonObjects.forEach((jsonStr) => {
      try {
        const obj = JSON.parse(jsonStr) as RFIDMessage;

        // Check if the RFID matches Bear 100 regex
        if (this.RFIRegex.test(obj.data.idHex)) {
          this.handleDatabaseInsert(obj);
        } else {
          console.log("Not Bear 100 regex");
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error, "Raw JSON:", jsonStr);
      }
      // Clear processed part of the buffer and retain any partial data if any
      const lastProcessedObjectIndex = this.buffer.lastIndexOf(jsonObjects[jsonObjects.length - 1]);
      this.buffer = this.buffer.slice(
        lastProcessedObjectIndex + jsonObjects[jsonObjects.length - 1].length
      );
    });
  }

  private handleDatabaseInsert(obj: RFIDMessage): void {
    const idhex = parseInt(obj.data.idHex);
    const timestamp = new Date(obj.timestamp);

    try {
      dbTimings.insertOrUpdateTimeRecord({
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
    } catch (error) {
      console.error("Error updating database:", error);
    }
  }

  public connect(addr: string) {
    this.url = "wss://" + addr + "/ws";
    this.handleReconnection();
  }

  public disconnect(): void {
    this.ws.close(1000, "CLient Closing Connection");
  }

  public sendMessage(message: string): void {
    if (this.status == RFIDReaderStatus.Connected) {
      this.ws.send(message);
    }
    this.eventEmitter.emit("error", "RFID not Connected"); //static message
  }

  public on(
    event: "connected" | "disconnected" | "error" | "messageReceived",
    listener: (...args: unknown[]) => void
  ): void {
    this.eventEmitter.on(event, listener);
  }
}
