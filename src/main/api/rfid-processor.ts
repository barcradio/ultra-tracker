/*
/ RFID web Socketts 
// THis is to inteefae with the ZEBRA FXR90 RFID scanner.  Cureently Exepcts to Recive a Similar looking 
// form the scanner"
 {"data":{"eventNum":5938,"format":"epc","idHex":"000000000000000000000343"},"timestamp":"2024-09-05T01:07:01.785-0600","type":"CUSTOM"}
/ where idhex is the the Bib nuber and the time stamp is the time when the bib was reed 
/
/ USER APPS repo for Zebra https://github.com/ZebraDevs/RFID_ZIOTC_Examples
*/
//import { ipcMain } from 'electron';
import { EventEmitter } from "events";
import WebSocket from "ws";
import * as dbTimings from "../database/timingRecords-db";

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

export class RFIDWebSocketProcessor {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectInterval: number = 5000; // milliseconds
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private eventEmitter: EventEmitter = new EventEmitter();
  private errorCount: number = 0;
  private buffer: string = "";
  private RFIDregex = /0{20}/;
  private url: string = "";

  // runner info queue

  constructor(url: string) {
    this.url = url;
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.ws = new WebSocket(this.url, {
      rejectUnauthorized: false // Allow self-signed certificates
    });

    this.ws.on("open", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.eventEmitter.emit("connected");
    });

    this.ws.on("message", (data) => {
      this.buffer += data.toString();
      console.debug("Received data:", data.toString());
      this.processIncomingMessages();
    });

    this.ws.on("close", () => {
      this.isConnected = false;
      console.log("Disconnected from RFID reader");
      this.eventEmitter.emit("disconnected");
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
        if (this.RFIDregex.test(obj.data.idHex)) {
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
      console.log(`RFID processed: ${idhex}`);
    } catch (error) {
      console.error("Error updating database:", error);
    }
  }

  public connnect(addr: string) {
    this.url = "wss://" + addr + "/ws";
    this.handleReconnection();
  }

  public disconnect(): void {
    this.ws.clos(1000, "CLient Closing Connection");
  }

  public sendMessage(message: string): void {
    if (this.isConnected) {
      this.ws.send(message);
    }
  }

  public on(
    event: "connected" | "disconnected" | "error" | "messageReceived",
    listener: (...args: unknown[]) => void
  ): void {
    this.eventEmitter.on(event, listener);
  }
}
