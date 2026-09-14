import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseStatus } from "$shared/enums";
import { initEventLogsHandlers } from "../eventLogs-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const getEventLogs = vi.hoisted(() => vi.fn());
vi.mock("../../database/eventLogger-db", () => ({ getEventLogs }));

describe("eventLogs-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    initEventLogsHandlers();
  });

  function invoke(channel: string, param?: unknown) {
    const handler = ipcHandlers.get(channel);
    if (!handler) throw new Error(`${channel} handler was not registered`);
    return handler(undefined, param);
  }

  it("get-event-logs forwards the verbose flag and returns the result", () => {
    getEventLogs.mockReturnValue([[], DatabaseStatus.Success, ""]);

    const result = invoke("get-event-logs", true);

    expect(getEventLogs).toHaveBeenCalledWith(true);
    expect(result).toEqual([[], DatabaseStatus.Success, ""]);
  });
});
