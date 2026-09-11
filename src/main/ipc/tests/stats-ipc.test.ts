import { beforeEach, describe, expect, it, vi } from "vitest";
import { initStatsHandlers } from "../stats-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const Calculate = vi.hoisted(() => vi.fn());
vi.mock("../../lib/stat-engine", () => ({ Calculate }));

describe("stats-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    initStatsHandlers();
  });

  it("stats-calculate forwards to the stat engine and returns its result", () => {
    Calculate.mockReturnValue({ totalRunners: 42 });

    const handler = ipcHandlers.get("stats-calculate");
    if (!handler) throw new Error("stats-calculate handler was not registered");
    const result = handler(undefined);

    expect(Calculate).toHaveBeenCalled();
    expect(result).toEqual({ totalRunners: 42 });
  });
});
