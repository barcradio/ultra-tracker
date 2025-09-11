// AFTER (use IRfidController casing + your actual RfidFactory that takes settings)
import { DeviceStatus } from "$shared/enums";
import { RfidSettings } from "$shared/models";
import { IRfidController } from "./interfaces/IRfid-controller";
import { RfidFactory } from "./rfid-reader-factory";
import * as rfidEmitter from "../../ipc/rfid-emitter";

export class RfidController {
  private reader?: IRfidController;
  private static instance: RfidController;

  private constructor() {
    // initialization logic
  }

  // Public static method to get the single instance
  public static getInstance(): RfidController {
    if (!RfidController.instance) {
      RfidController.instance = new RfidController();
    }
    return RfidController.instance;
  }

  async initialize(settings: RfidSettings) {
    this.reader = RfidFactory.create(settings);

    this.reader.on("tag-read", () => rfidEmitter.hasReadRFID());
    this.reader.on("error", (err) =>
      rfidEmitter.statusRFID(
        this.reader ? this.reader.getStatus() : DeviceStatus.Error,
        (err as Error).message
      )
    );
    this.reader.on("connected", () =>
      rfidEmitter.statusRFID(
        this.reader ? this.reader.getStatus() : DeviceStatus.Connected,
        "Reader connected"
      )
    );
    this.reader.on("disconnected", () =>
      rfidEmitter.statusRFID(
        this.reader ? this.reader.getStatus() : DeviceStatus.Disconnected,
        "Reader disconnected"
      )
    );

    await this.reader.initialize(settings);
  }

  public start() {
    this.reader?.startRFID();
    if (this.reader) {
      rfidEmitter.settingsRfid(this.reader.getSettings(), "Stopping RFID Reader");
    }
  }

  public stop() {
    this.reader?.stopRFID();
    if (this.reader) {
      rfidEmitter.settingsRfid(this.reader.getSettings(), "Stopping RFID Reader");
    }
  }

  public disconnect() {
    this.reader?.disconnect();
  }
  public setMode(mode: string): void {
    this.reader?.setMode(mode);
  }
  public getStatus(): DeviceStatus {
    return this.reader ? this.reader.getStatus() : DeviceStatus.NoDevice;
  }
  public getSettings(): RfidSettings | null | undefined {
    return this.reader?.getSettings();
  }
}
