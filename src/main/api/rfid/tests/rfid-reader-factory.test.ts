import { describe, expect, it, vi } from "vitest";
import { RfidSettings } from "../../../../shared/models";
import { RfidFactory } from "../rfid-reader-factory";

// vi.mock is hoisted above the module body, so the stub class has to be hoisted with it.
const FakeZebraController = vi.hoisted(() => class FakeZebraController {});
vi.mock("../zebra-fxr90/zebra-fxr90-controller", () => ({
  ZebraFxr90Controller: FakeZebraController
}));

describe("rfid-reader-factory", () => {
  it("builds a Zebra controller for a zebra-fxr90 reader", () => {
    const controller = RfidFactory.create({ type: "zebra-fxr90" } as RfidSettings);

    expect(controller).toBeInstanceOf(FakeZebraController);
  });

  it("refuses a reader type it does not know", () => {
    expect(() => RfidFactory.create({ type: "acme-9000" } as unknown as RfidSettings)).toThrow(
      "Unknown RFID type: acme-9000"
    );
  });
});
