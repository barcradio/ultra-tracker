// AFTER (use IRfidController casing + your actual RfidFactory that takes settings)
import { RfidSettings } from "$shared/models";
import { IRfidController } from "./interfaces/IRfid-controller";
import { RfidFactory } from "./rfid-reader-factory";
import * as rfidEmitter from "../../ipc/rfid-emitter";

export class RfidController {
  private reader?: IRfidController;

  async start(settings: RfidSettings) {
    this.reader = RfidFactory.create(settings);

    this.reader.on("tag-read",() => rfidEmitter.hasReadRFID());
   // this.reader.on("error", (err) => rfidEmitter.statusRFID("Error", (err as Error).message));
   // this.reader.on("connected", () => rfidEmitter.statusRFID("Connected", "Reader connected"));
   // this.reader.on("disconnected", () => rfidEmitter.statusRFID("Disconnected", "Reader disconnected"));

    await this.reader.initialize(settings);
    this.reader.startRFID();
  }

  stop() {
    this.reader?.stopRFID();
  }

  disconnect() {
    this.reader?.disconnect();
  }
}
