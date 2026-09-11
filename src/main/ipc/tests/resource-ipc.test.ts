import fs from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initResourceHandlers } from "../resource-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

function handlerFor(channel: string) {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new Error(`${channel} handler was not registered`);
  return handler;
}

describe("resource-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.restoreAllMocks();
    initResourceHandlers();
  });

  it("returns the contents of a resource file", () => {
    vi.spyOn(fs, "readFileSync").mockReturnValue("file contents");

    expect(handlerFor("get-resource")(undefined, "config/stations.json")).toBe("file contents");
  });

  it("reads the resource from the resources directory", () => {
    const readFileSync = vi.spyOn(fs, "readFileSync").mockReturnValue("x");

    handlerFor("get-resource")(undefined, "config/stations.json");

    expect(readFileSync).toHaveBeenCalledWith("./resources/config/stations.json", {
      encoding: "utf-8"
    });
  });

  it("returns null when the resource is missing", () => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(handlerFor("get-resource")(undefined, "missing.json")).toBeNull();
  });
});
