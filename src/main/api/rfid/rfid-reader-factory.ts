import { RfidSettings } from "$shared/models";
import { IRfidController } from "./interfaces/IRfid-controller";
import { ZebraFxr90Controller } from "./zebra-fxr90/zebra-fxr90-controller";

export class RfidFactory {
  static create(settings: RfidSettings): IRfidController {
    switch (settings.type) {
      case "zebra-fxr90":
        return new ZebraFxr90Controller();
      // Add new reader types here, e.g. case "raspberry-pi": return new RaspberryPiController();
      default:
        throw new Error(`Unknown RFID type: ${settings.type}`);
    }
  }
}
