// src/rfid/serial/SerialRfidController.ts
import { DeviceStatus } from "../../../../shared/enums";
import { RfidSettings } from "../../../../shared/models";
import { IRfidController, RfidEvent } from "../interfaces/IRfid-controller";

export class SerialRfidController implements IRfidController {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  on(event: RfidEvent, _listener: (...args: unknown[]) => void): void {
    throw new Error("Method not implemented.");
  }
  private settings!: RfidSettings;

  initialize(settings: RfidSettings): Promise<void> {
    this.settings = settings;
    throw new Error("Serial RFID Reader not implemented yet.");
  }

  connect(): void {
    throw new Error("Serial RFID Reader not implemented yet.");
  }

  disconnect(): void {
    throw new Error("Serial RFID Reader not implemented yet.");
  }

  startRFID(): void {
    throw new Error("Serial RFID Reader not implemented yet.");
  }

  stopRFID(): void {
    throw new Error("Serial RFID Reader not implemented yet.");
  }

  setMode(mode: string): void {
    throw new Error("Serial RFID Reader not implemented yet. unable to use $"+ mode);
  }

  getStatus(): DeviceStatus {
    throw new Error("Serial RFID Reader not implemented yet.");
  }
}
