import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceStatus } from "../../../shared/enums";
import { initRFIDHandlers } from "../rfid-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const rfid = vi.hoisted(() => ({
  InitializeRFIDReader: vi.fn(async () => "initialized"),
  StartRFIDReader: vi.fn(async () => "started"),
  StopRFIDReader: vi.fn(async () => "stopped"),
  DisconnectRFIDReader: vi.fn(async () => "disconnected"),
  GetRFIDStatus: vi.fn(() => DeviceStatus.Connected),
  IsRFIDScanning: vi.fn(() => true)
}));
vi.mock("../../api/rfid-processor", () => rfid);

function handlerFor(channel: string) {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new Error(`${channel} handler was not registered`);
  return handler;
}

function settings(overrides: Record<string, unknown> = {}) {
  return {
    type: "zebra-fxr90",
    restApiUrl: "reader.local",
    webSocketUrl: "reader.local",
    userName: "admin",
    password: "secret",
    sslCert: "AA:BB:CC",
    ...overrides
  };
}

describe("rfid-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    initRFIDHandlers();
  });

  describe("rfid-initialize", () => {
    it("passes trimmed connection settings to the reader", async () => {
      await handlerFor("rfid-initialize")(undefined, settings({ restApiUrl: "  reader.local  " }));

      expect(rfid.InitializeRFIDReader).toHaveBeenCalledWith(
        expect.objectContaining({ restApiUrl: "reader.local" })
      );
    });

    it("rejects an unsupported reader type", () => {
      expect(() =>
        handlerFor("rfid-initialize")(undefined, settings({ type: "acme-9000" }))
      ).toThrow("Unsupported RFID reader type.");
    });

    it("requires every connection field", () => {
      expect(() => handlerFor("rfid-initialize")(undefined, settings({ password: "" }))).toThrow(
        /are required/
      );
    });

    it("rejects a hostname with unsupported characters", () => {
      expect(() =>
        handlerFor("rfid-initialize")(undefined, settings({ restApiUrl: "reader.local;rm -rf /" }))
      ).toThrow(/unsupported characters/);
    });

    it("rejects a certificate serial with unsupported characters", () => {
      expect(() =>
        handlerFor("rfid-initialize")(undefined, settings({ sslCert: "AA BB/CC" }))
      ).toThrow(/certificate serial contains unsupported characters/);
    });

    // QUESTION FOR RUSS: the `if (!settings) return {}` early return skips every validation
    // below it, so a renderer that sends nothing reaches the reader with empty settings rather
    // than being rejected. Asserted as written; confirm whether that guard is intended.
    it("passes empty settings through when the renderer sends nothing", async () => {
      await handlerFor("rfid-initialize")(undefined, undefined);

      expect(rfid.InitializeRFIDReader).toHaveBeenCalledWith({});
    });
  });

  it("starts reading", async () => {
    await expect(handlerFor("rfid-start-reading")(undefined)).resolves.toBe("started");
  });

  it("stops reading", async () => {
    await expect(handlerFor("rfid-stop-reading")(undefined)).resolves.toBe("stopped");
  });

  it("disconnects the reader", async () => {
    await expect(handlerFor("rfid-disconnect")(undefined)).resolves.toBe("disconnected");
  });

  it("reports the reader status", () => {
    expect(handlerFor("rfid-get-status")(undefined)).toBe(DeviceStatus.Connected);
  });

  it("reports whether the reader is scanning", () => {
    expect(handlerFor("rfid-is-scanning")(undefined)).toBe(true);
  });
});
