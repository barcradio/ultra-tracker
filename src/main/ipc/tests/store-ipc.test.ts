import { beforeEach, describe, expect, it, vi } from "vitest";
import { initStoreHandlers } from "../store-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const appStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
  reset: vi.fn(),
  clear: vi.fn()
}));
vi.mock("../../lib/store", () => ({ appStore }));

describe("store-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    initStoreHandlers();
  });

  function invoke(channel: string, param?: unknown) {
    const handler = ipcHandlers.get(channel);
    if (!handler) throw new Error(`${channel} handler was not registered`);
    return handler(undefined, param);
  }

  it("get-store-value forwards the key and returns the stored value", () => {
    appStore.get.mockReturnValue("W1GBE-SK");

    const result = invoke("get-store-value", "station.operators.primary.callsign");

    expect(appStore.get).toHaveBeenCalledWith("station.operators.primary.callsign");
    expect(result).toBe("W1GBE-SK");
  });

  it("set-store-value forwards the key/value pair", () => {
    invoke("set-store-value", { key: "targetLanguage", value: "spa" });

    expect(appStore.set).toHaveBeenCalledWith("targetLanguage", "spa");
  });

  it("has-store-value forwards the key", () => {
    appStore.has.mockReturnValue(true);

    expect(invoke("has-store-value", "initialized")).toBe(true);
    expect(appStore.has).toHaveBeenCalledWith("initialized");
  });

  it("reset-store-value forwards the key", () => {
    invoke("reset-store-value", "display.gridFontScale");

    expect(appStore.reset).toHaveBeenCalledWith("display.gridFontScale");
  });

  it("delete-store-value forwards the key", () => {
    invoke("delete-store-value", "event.activeDatabaseSlug");

    expect(appStore.delete).toHaveBeenCalledWith("event.activeDatabaseSlug");
  });

  it("clear-store clears the entire store", () => {
    invoke("clear-store");

    expect(appStore.clear).toHaveBeenCalled();
  });
});
