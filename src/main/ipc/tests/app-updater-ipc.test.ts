import { beforeEach, describe, expect, it, vi } from "vitest";
import { initAppUpdaterHandlers } from "../app-updater-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const checkForAppUpdates = vi.hoisted(() => vi.fn(async () => undefined));
const getAppUpdateChannel = vi.hoisted(() => vi.fn(() => "beta"));
vi.mock("../../services/app-updater", () => ({ checkForAppUpdates, getAppUpdateChannel }));

describe("app-updater-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    initAppUpdaterHandlers();
  });

  it("registers a manual update check handler", async () => {
    const handler = ipcHandlers.get("check-for-app-updates");
    if (!handler) throw new Error("check-for-app-updates handler was not registered");

    await handler();

    expect(checkForAppUpdates).toHaveBeenCalledWith(true);
  });

  it("returns the effective app update channel", () => {
    const handler = ipcHandlers.get("get-app-update-channel");
    if (!handler) throw new Error("get-app-update-channel handler was not registered");

    expect(handler()).toBe("beta");
    expect(getAppUpdateChannel).toHaveBeenCalledOnce();
  });
});
