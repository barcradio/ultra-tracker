/*
/ RFID web Socketts 
// THis is to inteefae with the ZEBRA FXR90 RFID scanner.  Cureently Exepcts to Recive a Similar looking 
// form the scanner"
 {"data":{"eventNum":5938,"format":"epc","idHex":"000000000000000000000343"},"timestamp":"2024-09-05T01:07:01.785-0600","type":"CUSTOM"}
/ whree idhex is the the Bib nuber and the time stame is the time when the bib was reed 
/
/ USER APPS repo for Zebra https://github.com/ZebraDevs/RFID_ZIOTC_Examples
*/
import { ipcMain } from 'electron';
import { EventEmitter } from "events";
import WebSocket from "ws";
import appSettings from "electron-settings";
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
  private ws: WebSocket;
  private isConnected: boolean = false;
  private reconnectInterval: number = 5000; // milliseconds
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private eventEmitter: EventEmitter = new EventEmitter();
  private errorCount: number = 0;
  private lastError?: Error;
  private buffer: string = "";
  private RFIDregex = /0{20}/;
  private url: string = "";

  // runner info queue

  constructor(
    url: string,
    private messageHandler?: (idHex: number, timestamp: Date) => void // Custom handler
  ) {
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
      // console.log("Received data:", data.toString());
      this.processIncomingMessages(data.toString());
    });

    this.ws.on("close", () => {
      this.isConnected = false;
      console.log("Disconnected from RFID reader");
      this.eventEmitter.emit("disconnected");
      this.handleReconnection();
    });

    this.ws.on("error", (error) => {
      this.errorCount++;
      this.lastError = error;
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

  private processIncomingMessages(concatenatedMessage: string): void {
    const jsonObjects = concatenatedMessage.match(/{.*?}(?=\{|\s*$)/g);
    const stationIdentifier = appSettings.getSync("station.indentifier") as string;
    if (jsonObjects) {
      // Parse each JSON object
      const parsedObjects: RFIDMessage[] = jsonObjects.map(
        (jsonStr) => JSON.parse(jsonStr) as RFIDMessage
      );

      // Output the parsed objects
      parsedObjects.forEach((obj) => {
        //test if the RFID is a bear100;
        if (this.RFIDregex.test(obj.data.idHex)) {
          const idhex = parseInt(obj.data.idHex);
          const timestamp = new Date(obj.timestamp);

          dbTimings.insertOrUpdateTimeRecord({
            index: -1,
            bibId: idhex,
            stationId: stationIdentifier,
            timeIn: timestamp,
            timeOut: timestamp,
            timeModified: timestamp,
            note: "RFID",
            sent: false,
            status: -1
          });


      //    if (this.messageHandler) {
//
      //      this.messageHandler(idhex, timestamp);
      //    }
      //    //ipcMain.emit("runner-data", { idhex, timestamp });
        } else {
          console.log("Not Bear 100 regex");
        }
      });
    } else {
      console.log("No valid JSON objects found");
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
