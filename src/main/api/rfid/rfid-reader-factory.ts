// AFTER (only import path + casing change on interface, keep the rest)
import { RfidSettings } from "$shared/models";
import { IRfidController } from "./interfaces/IRfid-controller";
import { SerialRfidController } from "./serial/serial-rfid-controller";
import { RfidService } from "./web/rfid-service";

export class RfidFactory {
  static create(settings: RfidSettings): IRfidController {
    switch (settings.type) {
      case "web":
        return new RfidService();
      case "serial":
        return new SerialRfidController();
      default:
        throw new Error(`Unknown RFID type: ${settings.type}`);
    }
  }
}
