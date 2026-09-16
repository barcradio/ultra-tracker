import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceStatus } from "../../../shared/enums";
import {
  DisconnectRFIDReader,
  GetRFIDSettings,
  GetRFIDStatus,
  InitializeRFIDReader,
  IsRFIDScanning,
  RecoverRFIDReader,
  SetRFIDMode,
  StartRFIDReader,
  StopRFIDReader
} from "../rfid-processor";

const controller = vi.hoisted(() => {
  const listeners = new Map<string, (payload?: unknown) => void>();
  return {
    listeners,
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      listeners.set(event, handler);
    }),
    initialize: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    startRFID: vi.fn(async () => undefined),
    stopRFID: vi.fn(async () => undefined),
    recover: vi.fn(),
    setMode: vi.fn(),
    getStatus: vi.fn(() => DeviceStatus.Connected),
    isScanning: vi.fn(() => true),
    getSettings: vi.fn(() => ({ type: "zebra-fxr90" }))
  };
});

const create = vi.hoisted(() => vi.fn());
vi.mock("../rfid/rfid-reader-factory", () => ({ RfidFactory: { create } }));

const logRFID = vi.hoisted(() => vi.fn());
vi.mock("../rfid/rfid-log", () => ({
  logRFID,
  LogLevel: { error: 0, warn: 1, info: 2 }
}));

const rfidEmitter = vi.hoisted(() => ({ statusRFID: vi.fn(), hasReadRFID: vi.fn() }));
vi.mock("../../ipc/rfid-emitter", () => rfidEmitter);

const settings = {
  type: "zebra-fxr90",
  restApiUrl: "reader.local",
  webSocketUrl: "reader.local",
  userName: "admin",
  password: "secret",
  sslCert: "AABBCC"
};

// The processor keeps one controller in module scope; disconnecting returns it to a clean state.
async function resetProcessor() {
  await DisconnectRFIDReader();
  vi.clearAllMocks();
  create.mockReturnValue(controller);
  controller.getStatus.mockReturnValue(DeviceStatus.Connected);
  controller.isScanning.mockReturnValue(true);
  controller.initialize.mockResolvedValue(undefined);
  controller.disconnect.mockResolvedValue(undefined);
  controller.startRFID.mockResolvedValue(undefined);
  controller.stopRFID.mockResolvedValue(undefined);
}

describe("rfid-processor", () => {
  beforeEach(async () => {
    await resetProcessor();
  });

  describe("before a reader is initialized", () => {
    it("reports no device", () => {
      expect(GetRFIDStatus()).toBe(DeviceStatus.NoDevice);
    });

    it("reports it is not scanning", () => {
      expect(IsRFIDScanning()).toBe(false);
    });

    it("has no settings", () => {
      expect(GetRFIDSettings()).toBeNull();
    });

    it("says so when asked to start", async () => {
      await expect(StartRFIDReader()).resolves.toBe("RFID not initialized");
    });

    it("says so when asked to stop", async () => {
      await expect(StopRFIDReader()).resolves.toBe("RFID not initialized");
    });

    it("says so when asked to change mode", () => {
      expect(SetRFIDMode("inventory")).toBe("RFID not initialized");
    });

    it("says so when asked to disconnect", async () => {
      await expect(DisconnectRFIDReader()).resolves.toBe("RFID was not connected");
    });

    it("ignores a recovery request", () => {
      expect(() => RecoverRFIDReader()).not.toThrow();
    });
  });

  describe("InitializeRFIDReader", () => {
    it("builds a controller from the supplied settings and connects", async () => {
      const result = await InitializeRFIDReader(settings);

      expect(result).toBe("RFID authenticated");
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ restApiUrl: "reader.local" }));
      expect(controller.initialize).toHaveBeenCalled();
    });

    it("fills in the defaults for anything the caller omits", async () => {
      await InitializeRFIDReader({ restApiUrl: "other.local" } as never);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "zebra-fxr90", websocketPort: 443 })
      );
    });

    it("does nothing when a reader is already connected", async () => {
      await InitializeRFIDReader(settings);
      create.mockClear();

      const result = await InitializeRFIDReader(settings);

      expect(result).toBe("RFID already connected");
      expect(create).not.toHaveBeenCalled();
    });

    it("reconnects when the previous reader dropped", async () => {
      await InitializeRFIDReader(settings);
      controller.getStatus.mockReturnValue(DeviceStatus.Disconnected);
      create.mockClear();

      const result = await InitializeRFIDReader(settings);

      expect(result).toBe("RFID authenticated");
      expect(create).toHaveBeenCalled();
    });

    it("reports a connection failure instead of throwing", async () => {
      controller.initialize.mockRejectedValue(new Error("unreachable"));

      const result = await InitializeRFIDReader(settings);

      expect(result).toBe("RFID initialization failed: unreachable");
      expect(rfidEmitter.statusRFID).toHaveBeenCalledWith(DeviceStatus.Error, "unreachable");
    });

    describe("controller events", () => {
      beforeEach(async () => {
        await InitializeRFIDReader(settings);
        rfidEmitter.statusRFID.mockClear();
      });

      it("tells the renderer when the reader connects", () => {
        controller.listeners.get("connected")?.();

        expect(rfidEmitter.statusRFID).toHaveBeenCalledWith(
          DeviceStatus.Connected,
          "RFID Connected"
        );
      });

      it("tells the renderer when the reader disconnects", () => {
        controller.listeners.get("disconnected")?.();

        expect(rfidEmitter.statusRFID).toHaveBeenCalledWith(
          DeviceStatus.Disconnected,
          "RFID Disconnected"
        );
      });

      it("logs and reports a reader error", () => {
        controller.listeners.get("error")?.(new Error("antenna fault"));

        expect(logRFID).toHaveBeenCalled();
        expect(rfidEmitter.statusRFID).toHaveBeenCalledWith(DeviceStatus.Error, "antenna fault");
      });

      it("reports a non-Error reader failure as text", () => {
        controller.listeners.get("error")?.("plain string fault");

        expect(rfidEmitter.statusRFID).toHaveBeenCalledWith(
          DeviceStatus.Error,
          "plain string fault"
        );
      });

      it("announces every tag read", () => {
        controller.listeners.get("tag-read")?.();

        expect(rfidEmitter.hasReadRFID).toHaveBeenCalled();
      });
    });
  });

  describe("with a connected reader", () => {
    beforeEach(async () => {
      await InitializeRFIDReader(settings);
    });

    it("reports the controller's status", () => {
      expect(GetRFIDStatus()).toBe(DeviceStatus.Connected);
    });

    it("reports whether it is scanning", () => {
      expect(IsRFIDScanning()).toBe(true);
    });

    it("returns the controller's settings", () => {
      expect(GetRFIDSettings()).toEqual({ type: "zebra-fxr90" });
    });

    it("starts reading", async () => {
      await expect(StartRFIDReader()).resolves.toBe("RFID reading started");
    });

    it("reports a failure to start", async () => {
      controller.startRFID.mockRejectedValue(new Error("busy"));

      await expect(StartRFIDReader()).resolves.toBe("Failed to start RFID: busy");
    });

    it("stops reading", async () => {
      await expect(StopRFIDReader()).resolves.toBe("RFID reading stopped");
    });

    it("reports a failure to stop", async () => {
      controller.stopRFID.mockRejectedValue(new Error("busy"));

      await expect(StopRFIDReader()).resolves.toBe("Failed to stop RFID: busy");
    });

    it("sets the reader mode", () => {
      expect(SetRFIDMode("inventory")).toBe("RFID mode set");
      expect(controller.setMode).toHaveBeenCalledWith("inventory");
    });

    it("reports a failure to set the mode", () => {
      controller.setMode.mockImplementation(() => {
        throw new Error("unsupported");
      });

      expect(SetRFIDMode("nonsense")).toBe("Failed to set RFID mode: unsupported");
    });

    it("asks the controller to recover", () => {
      RecoverRFIDReader();

      expect(controller.recover).toHaveBeenCalled();
    });

    it("disconnects cleanly", async () => {
      await expect(DisconnectRFIDReader()).resolves.toBe("RFID reader stopped and disconnected");
      expect(GetRFIDStatus()).toBe(DeviceStatus.NoDevice);
    });

    it("releases the reader locally even when the remote stop fails", async () => {
      controller.disconnect.mockRejectedValue(new Error("timeout"));

      const result = await DisconnectRFIDReader();

      expect(result).toContain("unable to stop it remotely: timeout");
      expect(GetRFIDStatus()).toBe(DeviceStatus.NoDevice);
    });
  });
});
