import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceStatus } from "../../../shared/enums";
import { emitConnectionStatus } from "../connectivity-emitter";
import { hasReadRFID, statusRFID } from "../rfid-emitter";
import { emitRunnersTableChanged } from "../runner-data-emitter";
import { sendToastToRenderer } from "../toast-ipc";

const webContents = vi.hoisted(() => ({ send: vi.fn(), reload: vi.fn() }));
const fromId = vi.hoisted(() => vi.fn());

vi.mock("electron", () => ({
  BrowserWindow: { fromId }
}));

describe("renderer emitters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromId.mockReturnValue({ webContents });
  });

  it("tells the renderer the runners table changed", () => {
    emitRunnersTableChanged();

    expect(webContents.send).toHaveBeenCalledWith("runners-table-changed");
  });

  it("sends a toast to the renderer", () => {
    const toast = { message: "saved", type: "success" } as never;

    sendToastToRenderer(toast);

    expect(webContents.send).toHaveBeenCalledWith("create-toast", toast);
  });

  it("announces an RFID read", () => {
    hasReadRFID();

    expect(webContents.send).toHaveBeenCalledWith("read-rfid");
  });

  it("announces an RFID status change with its message", () => {
    statusRFID(DeviceStatus.Connected, "reader online");

    expect(webContents.send).toHaveBeenCalledWith(
      "status-rfid",
      DeviceStatus.Connected,
      "reader online"
    );
  });

  it("announces an OpenSplitTime connection status change", () => {
    const status = { connected: true } as never;

    emitConnectionStatus(status);

    expect(webContents.send).toHaveBeenCalledWith("status-opensplittime-connection", status);
  });

  it("stays quiet when the main window is gone", () => {
    fromId.mockReturnValue(undefined);

    emitRunnersTableChanged();
    sendToastToRenderer({ message: "x", type: "info" } as never);
    hasReadRFID();

    expect(webContents.send).not.toHaveBeenCalled();
  });
});
