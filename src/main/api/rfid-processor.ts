/*
/ RFID Web Sockets
// This is to interface with the ZEBRA FXR90 RFID scanner.  Currently Expects to receive Similar looking form the scanner"
 {"data":{"eventNum":5938,"format":"epc","idHex":"000000000000000000000343"},"timestamp":"2024-09-05T01:07:01.785-0600","type":"CUSTOM"}
/ where idhex is the the Bib number and the time stamp is the time when the bib was reed
/
/ USER APPS repo for Zebra https://github.com/ZebraDevs/RFID_ZIOTC_Examples
// Documentation: https://zebradevs.github.io/rfid-ziotc-docs/setupziotc/index.html#start-reads
*/
import { WebSocketClient } from "./WebSocketClient";
import { DeviceStatus } from "../../shared/enums";
import * as dbTimings from "../database/timingRecords-db";

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

export class RFIDProcessor {
  private wsClient: WebSocketClient;
  private buffer: string = "";
  private RFIRegex = /0{20}/;

  constructor(url: string) {
    this.wsClient = new WebSocketClient(url);

    this.wsClient.on("message", (data) => this.processIncomingMessages(data));
    this.wsClient.on("connected", () => console.log("RFID WebSocket connected"));
    this.wsClient.on("disconnected", () => console.log("RFID WebSocket disconnected"));
    this.wsClient.on("error", (error) => console.error("RFID WebSocket error:", error));
  }

  private processIncomingMessages(data: string): void {
    this.buffer += data;
    const jsonObjects = this.buffer.match(/{.*?}(?=\{|\s*$)/g);

    if (!jsonObjects) return;

    jsonObjects.forEach((jsonStr) => {
      try {
        const obj = JSON.parse(jsonStr) as RFIDMessage;

        if (this.RFIRegex.test(obj.data.idHex)) {
          this.handleDatabaseInsert(obj);
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error, "Raw JSON:", jsonStr);
      }

      const lastProcessedObjectIndex = this.buffer.lastIndexOf(jsonObjects[jsonObjects.length - 1]);
      this.buffer = this.buffer.slice(lastProcessedObjectIndex + jsonObjects[jsonObjects.length - 1].length);
    });
  }

  private handleDatabaseInsert(obj: RFIDMessage): void {
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
    } catch (error) {
      console.error("Error updating database:", error);
    }
  }

  public connect(addr: string) {
    this.wsClient.connect(addr);
  }

  public disconnect(): void {
    this.wsClient.disconnect();
  }

  public getStatus(): DeviceStatus {
    return this.wsClient.getStatus();
  }
}
