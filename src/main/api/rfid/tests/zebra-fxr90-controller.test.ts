import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceStatus } from "../../../../shared/enums";
import { RfidSettings } from "../../../../shared/models";
import { ZebraFxr90Controller } from "../zebra-fxr90/zebra-fxr90-controller";

const restClient = vi.hoisted(() => ({
  login: vi.fn(async () => true),
  start: vi.fn(async () => undefined),
  stop: vi.fn(async () => undefined),
  setMode: vi.fn(),
  getRadioActivity: vi.fn(async (): Promise<string> => "inactive"),
  getLastError: vi.fn((): string | null => null)
}));
vi.mock("../zebra-fxr90/zebra-rest-client", () => ({
  ZebraRestClient: vi.fn(function () {
    return restClient;
  })
}));

const processor = vi.hoisted(() => {
  const listeners = new Map<string, (payload?: unknown) => void>();
  return {
    listeners,
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      listeners.set(event, handler);
    }),
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn()
  };
});
vi.mock("../zebra-fxr90/zebra-websocket-processor", () => ({
  ZebraWebSocketProcessor: vi.fn(function () {
    return processor;
  })
}));

const timingWriter = vi.hoisted(() => ({
  write: vi.fn(),
  recoverPendingWrites: vi.fn()
}));
vi.mock("../rfid-timing-writer", () => ({
  RfidTimingWriter: vi.fn(function () {
    return timingWriter;
  })
}));

const rfidEmitter = vi.hoisted(() => ({ statusRFID: vi.fn(), hasReadRFID: vi.fn() }));
vi.mock("../../../ipc/rfid-emitter", () => rfidEmitter);

const logRFID = vi.hoisted(() => vi.fn());
vi.mock("../rfid-log", () => ({ logRFID, LogLevel: { error: 0, warn: 1, info: 2 } }));

function settings(): RfidSettings {
  return {
    type: "zebra-fxr90",
    restApiUrl: "reader.local",
    webSocketUrl: "reader.local",
    websocketPort: 443,
    secureWebsocket: true,
    userName: "admin",
    password: "secret",
    sslCert: "AABBCC",
    status: DeviceStatus.NoDevice
  } as RfidSettings;
}

describe("zebra-fxr90-controller", () => {
  let controller: ZebraFxr90Controller;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    processor.listeners.clear();
    restClient.login.mockResolvedValue(true);
    restClient.getRadioActivity.mockResolvedValue("inactive");
    restClient.getLastError.mockReturnValue(null);
    processor.connect.mockResolvedValue(undefined);
    controller = new ZebraFxr90Controller();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("before initialization", () => {
    it("reports no device", () => {
      expect(controller.getStatus()).toBe(DeviceStatus.NoDevice);
    });

    it("is not scanning", () => {
      expect(controller.isScanning()).toBe(false);
    });

    it("refuses to start reading", async () => {
      await expect(controller.startRFID()).rejects.toThrow("reader not initialized");
    });

    it("warns rather than throwing when asked to connect", () => {
      controller.connect();

      expect(logRFID).toHaveBeenCalled();
      expect(processor.connect).not.toHaveBeenCalled();
    });
  });

  describe("initialize", () => {
    it("logs in over REST and opens the websocket", async () => {
      await controller.initialize(settings());

      expect(restClient.login).toHaveBeenCalled();
      expect(processor.connect).toHaveBeenCalled();
    });

    it("fails with the REST client's reason when login is rejected", async () => {
      restClient.login.mockResolvedValue(false);
      restClient.getLastError.mockReturnValue("bad certificate");

      await expect(controller.initialize(settings())).rejects.toThrow(
        "RFID REST login failed: bad certificate"
      );
    });

    it("falls back to a generic reason when the REST client gives none", async () => {
      restClient.login.mockResolvedValue(false);
      restClient.getLastError.mockReturnValue(null);

      await expect(controller.initialize(settings())).rejects.toThrow(/unknown error/);
    });

    it("picks up the reader's current scanning state", async () => {
      restClient.getRadioActivity.mockResolvedValue("active");

      await controller.initialize(settings());

      expect(controller.isScanning()).toBe(true);
    });

    it("replays any timing writes queued from a previous session", async () => {
      await controller.initialize(settings());

      expect(timingWriter.recoverPendingWrites).toHaveBeenCalled();
    });
  });

  describe("once initialized", () => {
    beforeEach(async () => {
      await controller.initialize(settings());
      vi.clearAllMocks();
    });

    it("reports connected when the websocket opens", () => {
      processor.listeners.get("connected")?.();

      expect(controller.getStatus()).toBe(DeviceStatus.Connected);
      expect(rfidEmitter.statusRFID).toHaveBeenCalledWith(
        DeviceStatus.Connected,
        "RFID reader connected"
      );
    });

    it("writes each tag read to the timing database and tells the renderer", () => {
      const tagRead = { bibId: 101, timestamp: new Date() };

      processor.listeners.get("tag-read")?.(tagRead);

      expect(timingWriter.write).toHaveBeenCalledWith(tagRead);
      expect(rfidEmitter.hasReadRFID).toHaveBeenCalled();
    });

    it("passes a tag read on to its own listeners", () => {
      const seen = vi.fn();
      controller.on("tag-read", seen);
      const tagRead = { bibId: 101, timestamp: new Date() };

      processor.listeners.get("tag-read")?.(tagRead);

      expect(seen).toHaveBeenCalledWith(tagRead);
    });

    it("reports a reader error to its listeners", () => {
      const seen = vi.fn();
      controller.on("error", seen);

      processor.listeners.get("error")?.(new Error("antenna fault"));

      expect(seen).toHaveBeenCalledWith(expect.objectContaining({ message: "antenna fault" }));
    });

    it("starts reading through the REST client", async () => {
      await controller.startRFID();

      expect(restClient.start).toHaveBeenCalled();
      expect(controller.isScanning()).toBe(true);
    });

    it("stops reading through the REST client", async () => {
      await controller.startRFID();

      await controller.stopRFID();

      expect(restClient.stop).toHaveBeenCalled();
      expect(controller.isScanning()).toBe(false);
    });

    it("passes a mode change to the REST client", () => {
      controller.setMode("inventory");

      expect(restClient.setMode).toHaveBeenCalledWith("inventory");
    });

    it("returns the settings it was initialized with", () => {
      expect(controller.getSettings()).toMatchObject({ restApiUrl: "reader.local" });
    });

    it("closes everything down on disconnect", async () => {
      await controller.disconnect();

      expect(processor.disconnect).toHaveBeenCalled();
      expect(restClient.stop).toHaveBeenCalled();
      expect(controller.isScanning()).toBe(false);
    });

    it("drops the websocket on recover so it reconnects", () => {
      controller.recover();

      expect(processor.disconnect).toHaveBeenCalled();
      expect(controller.isScanning()).toBe(false);
    });
  });

  describe("health checks", () => {
    beforeEach(async () => {
      await controller.initialize(settings());
      processor.listeners.get("connected")?.();
      vi.clearAllMocks();
    });

    it("polls the reader periodically", async () => {
      await vi.advanceTimersByTimeAsync(30_000);

      expect(restClient.getRadioActivity).toHaveBeenCalled();
    });

    it("tolerates an occasional failed check", async () => {
      const seen = vi.fn();
      controller.on("error", seen);
      restClient.getRadioActivity.mockRejectedValueOnce(new Error("timeout"));

      await vi.advanceTimersByTimeAsync(30_000);

      expect(seen).not.toHaveBeenCalled();
      expect(controller.getStatus()).toBe(DeviceStatus.Connected);
    });

    it("declares the reader offline after repeated failures", async () => {
      const seen = vi.fn();
      controller.on("error", seen);
      restClient.getRadioActivity.mockRejectedValue(new Error("timeout"));

      await vi.advanceTimersByTimeAsync(90_000);

      expect(seen).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("offline") })
      );
      expect(processor.disconnect).toHaveBeenCalled();
    });
  });

  describe("reconnecting after an unexpected drop", () => {
    beforeEach(async () => {
      await controller.initialize(settings());
      processor.listeners.get("connected")?.();
      vi.clearAllMocks();
    });

    it("reports the disconnect to the renderer", () => {
      processor.listeners.get("disconnected")?.();

      expect(controller.getStatus()).toBe(DeviceStatus.Disconnected);
      expect(rfidEmitter.statusRFID).toHaveBeenCalledWith(
        DeviceStatus.Disconnected,
        "RFID reader disconnected"
      );
    });

    it("retries the connection on a backoff", async () => {
      processor.listeners.get("disconnected")?.();

      await vi.advanceTimersByTimeAsync(5_000);

      expect(restClient.login).toHaveBeenCalled();
      expect(processor.connect).toHaveBeenCalled();
    });

    it("gives up after ten attempts", async () => {
      const seen = vi.fn();
      controller.on("error", seen);
      restClient.login.mockResolvedValue(false);

      processor.listeners.get("disconnected")?.();
      await vi.advanceTimersByTimeAsync(10 * 60_000);

      expect(seen).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("after 10 attempts") })
      );
    });

    it("does not reconnect after the operator disconnects on purpose", async () => {
      await controller.disconnect();
      vi.clearAllMocks();

      processor.listeners.get("disconnected")?.();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(restClient.login).not.toHaveBeenCalled();
    });
  });
});
