import { RfidSettings } from "$shared/models";
import { IRfidController } from "./interfaces/IRfid-controller";
import { RfidService } from "./rfid-service";

export class RfidFactory {
  static create(settings: RfidSettings): IRfidController {
    switch (settings.type) {
      case "web":
        return new RfidService();
      default:
        throw new Error(`Unknown RFID type: ${settings.type}`);
    }
  }
}
