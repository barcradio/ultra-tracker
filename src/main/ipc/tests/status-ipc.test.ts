import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DropReason } from "$shared/enums";
import { initStatusHandlers } from "../status-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const SetDrop = vi.hoisted(() => vi.fn());
vi.mock("../../database/status-db", () => ({ SetDrop }));

describe("status-ipc: set-drop", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    SetDrop.mockReset();
    SetDrop.mockReturnValue(["ok"]);
    initStatusHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function invoke(data: Record<string, unknown>) {
    const handler = ipcHandlers.get("set-drop");
    if (!handler) throw new Error("set-drop handler was not registered");
    return handler(undefined, data);
  }

  it("passes through a valid drop with a recognized reason", () => {
    const timeOut = new Date("2026-09-09T00:00:00.000Z");
    const result = invoke({ bibId: 101, timeOut, dropped: true, dropReason: DropReason.Medical });

    expect(SetDrop).toHaveBeenCalledWith(101, timeOut, true, DropReason.Medical);
    expect(result).toEqual(["ok"]);
  });

  it("forces dropped=false and reason=None when dropReason is not a recognized value", () => {
    invoke({ bibId: 101, timeOut: null, dropped: true, dropReason: "not-a-real-reason" });

    expect(SetDrop).toHaveBeenCalledWith(101, null, false, DropReason.None);
  });

  it("forces dropped=false when dropReason is explicitly None", () => {
    invoke({ bibId: 101, timeOut: null, dropped: true, dropReason: DropReason.None });

    expect(SetDrop).toHaveBeenCalledWith(101, null, false, DropReason.None);
  });

  it("forces reason=None whenever dropped is false, even with a valid reason", () => {
    invoke({ bibId: 101, timeOut: null, dropped: false, dropReason: DropReason.Withdrew });

    expect(SetDrop).toHaveBeenCalledWith(101, null, false, DropReason.None);
  });
});
