import { beforeEach, describe, expect, it, vi } from "vitest";
import { initSettingsHandlers } from "../settings-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const appStore = vi.hoisted(() => ({ get: vi.fn(), path: "C:/fake/config.json" }));
const clearAppStore = vi.hoisted(() => vi.fn());
vi.mock("../../lib/store", () => ({ appStore, clearAppStore }));

describe("settings-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    initSettingsHandlers();
  });

  function invoke(channel: string, param?: unknown) {
    const handler = ipcHandlers.get(channel);
    if (!handler) throw new Error(`${channel} handler was not registered`);
    return handler(undefined, param);
  }

  it("app-store forwards the requested path", () => {
    appStore.get.mockReturnValue({ name: "Default Station" });

    const result = invoke("app-store", "station");

    expect(appStore.get).toHaveBeenCalledWith("station");
    expect(result).toEqual({ name: "Default Station" });
  });

  it("reset-app-settings clears the store and reports its path", () => {
    const result = invoke("reset-app-settings");

    expect(clearAppStore).toHaveBeenCalled();
    expect(result).toBe("C:/fake/config.json: Reset!");
  });
});
