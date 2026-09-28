import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceStatus } from "../../../shared/enums";
import { confirmBeforeClosing } from "../confirm-close";

const showMessageBoxSync = vi.hoisted(() => vi.fn());
const GetRFIDStatus = vi.hoisted(() => vi.fn());

vi.mock("../../api/rfid-processor", () => ({ GetRFIDStatus }));

const getAuthStatus = vi.hoisted(() => vi.fn());
vi.mock("../../services/opensplittime", () => ({ getAuthStatus }));

vi.mock("electron", async () => {
  const { EventEmitter } = await import("events");
  return {
    app: Object.assign(new EventEmitter(), { quit: vi.fn() }),
    dialog: { showMessageBoxSync }
  };
});

const app = (await import("electron")).app as unknown as EventEmitter & {
  quit: ReturnType<typeof vi.fn>;
};

function closeWindow(window: EventEmitter) {
  const event = { preventDefault: vi.fn() };
  window.emit("close", event);
  return event;
}

describe("confirmBeforeClosing", () => {
  let window: EventEmitter;

  beforeEach(() => {
    vi.clearAllMocks();
    GetRFIDStatus.mockReturnValue(DeviceStatus.NoDevice);
    getAuthStatus.mockReturnValue({ authenticated: false, expiration: null });
    app.removeAllListeners();
    window = new EventEmitter();
    confirmBeforeClosing(window as never);
  });

  it("keeps the window open when the operator cancels", () => {
    showMessageBoxSync.mockReturnValue(1);

    const event = closeWindow(window);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(app.quit).not.toHaveBeenCalled();
  });

  it("quits when the operator confirms", () => {
    showMessageBoxSync.mockReturnValue(0);

    closeWindow(window);

    expect(app.quit).toHaveBeenCalled();
  });

  it("defaults to Cancel so Enter never quits by accident", () => {
    showMessageBoxSync.mockReturnValue(1);

    closeWindow(window);

    expect(showMessageBoxSync.mock.calls[0][1]).toMatchObject({ defaultId: 1, cancelId: 1 });
  });

  function detailWhen(rfid: DeviceStatus, signedIn: boolean) {
    GetRFIDStatus.mockReturnValue(rfid);
    getAuthStatus.mockReturnValue({ authenticated: signedIn, expiration: null });
    showMessageBoxSync.mockReturnValue(1);
    closeWindow(window);
    return showMessageBoxSync.mock.lastCall?.[1].detail;
  }

  it("only says the data is saved when nothing needs reconnecting", () => {
    expect(detailWhen(DeviceStatus.NoDevice, false)).toBe("Your data is saved.");
  });

  it("mentions the RFID reader only while one is connected", () => {
    expect(detailWhen(DeviceStatus.Disconnected, false)).not.toMatch(/RFID/);
    expect(detailWhen(DeviceStatus.Connected, false)).toBe(
      "Your data is saved.\nWhen Ultra Tracker is opened again, the RFID reader will need to be reconnected."
    );
  });

  it("mentions OpenSplitTime only while signed in", () => {
    expect(detailWhen(DeviceStatus.NoDevice, true)).toBe(
      "Your data is saved.\nReconnect to OpenSplitTime when you reopen the app."
    );
  });

  it("mentions both when RFID is connected and OpenSplitTime is signed in", () => {
    expect(detailWhen(DeviceStatus.Connected, true)).toBe(
      "Your data is saved.\nWhen Ultra Tracker is opened again, the RFID reader will need to be reconnected.\nReconnect to OpenSplitTime when you reopen the app."
    );
  });

  it("closes without asking once the app is already quitting", () => {
    app.emit("before-quit");

    const event = closeWindow(window);

    expect(showMessageBoxSync).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("closes without asking when the OS session is ending", () => {
    window.emit("session-end");

    const event = closeWindow(window);

    expect(showMessageBoxSync).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
