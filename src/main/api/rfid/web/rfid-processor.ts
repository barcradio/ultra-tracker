/*
/ RFID Web Sockets
// This is to interface with the ZEBRA FXR90 RFID scanner.  Currently Expects to receive Similar looking form the scanner"
 {"data":{"eventNum":5938,"format":"epc","idHex":"000000000000000000000343"},"timestamp":"2024-09-05T01:07:01.785-0600","type":"CUSTOM"}
/ where idhex is the the Bib number and the time stamp is the time when the bib was reed
/
/ USER APPS repo for Zebra https://github.com/ZebraDevs/RFID_ZIOTC_Examples
// Documentation: https://zebradevs.github.io/rfid-ziotc-docs/setupziotc/index.html#start-reads
*/

import EventEmitter from "events";
import WebSocket from "ws";
import { RfidSettings } from "$shared/models";
import { RfidData } from "$shared/types";

type RfidProcessorEvents = {
  error: (error: Error) => void;
  "tag-read": (data: RfidData) => void;
  connected: () => void;
  disconnected: () => void;
};
export class RfidDataProcessor {
  private ws: WebSocket | null = null;
  private buffer: string = "";
  private rfidRegex: RegExp;
  private url: string;
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(settings: RfidSettings) {
    const protocol = settings.secureWebsocket ? "wss" : "ws";
    this.url = `${protocol}://${settings.webSocketUrl}:${settings.websocketPort}/ws`;
    this.rfidRegex = settings.rfidTagRegx || /0{20}/;
  }

  public connect(): void {
    this.ws = new WebSocket(this.url, { rejectUnauthorized: false });

    this.ws.on("open", () => this.eventEmitter.emit("connected"));
    this.ws.on("close", () => this.eventEmitter.emit("disconnected"));
    this.ws.on("error", (err) => this.eventEmitter.emit("error", err));
    this.ws.on("message", (data) => this.processIncomingMessages(data.toString()));
  }

  public disconnect(): void {
    this.ws?.close(1000, "Normal closure");
    this.ws = null;
  }

  private processIncomingMessages(data: string): void {
    this.buffer += data;

    // Get all complete top-level JSON objects (non-greedy)
    const jsonObjects = this.buffer.match(/{.*?}(?=\{|\s*$)/g);
    if (!jsonObjects) return;

    // Parse each JSON safely
    for (const jsonStr of jsonObjects) {
      try {
        const obj = JSON.parse(jsonStr) as RfidData;

        // NOTE: clarify allow vs reject.
        // If your regex is a REJECT pattern (e.g., all zeros),
        // then invert the test: if (!this.rfidRegex.test(...)) emit.
        if (this.rfidRegex.test(obj.data.idHex)) {
          this.eventEmitter.emit("tag-read", obj);
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error, "Raw JSON:", jsonStr);
        this.eventEmitter.emit("error", error as Error);
      }
    }

    // Trim buffer ONCE: keep anything after the LAST complete object
    const last = jsonObjects[jsonObjects.length - 1];
    const cut = this.buffer.lastIndexOf(last) + last.length;
    this.buffer = this.buffer.slice(cut);
  }

  public on<K extends keyof RfidProcessorEvents>(event: K, listener: RfidProcessorEvents[K]): void {
    this.eventEmitter.on(event, listener);
  }
}
