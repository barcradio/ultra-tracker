import { beforeEach, describe, expect, it, vi } from "vitest";
import { initExportHandlers } from "../export-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());
const shell = vi.hoisted(() => ({ openPath: vi.fn() }));

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  },
  shell
}));

const dbRunners = vi.hoisted(() => ({
  exportRunnersAsCSV: vi.fn(() => "full export done"),
  exportUnsentRunnersAsCSV: vi.fn(() => "incremental export done"),
  exportDropsAsCSV: vi.fn(() => "drops export done")
}));
vi.mock("../../database/runners-db", () => dbRunners);
vi.mock("../../lib/file-dialogs", () => ({ AppPaths: { userRoot: "/tmp/exports" } }));

function handlerFor(channel: string) {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new Error(`${channel} handler was not registered`);
  return handler;
}

describe("export-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    initExportHandlers();
  });

  it("exports the full runners file", () => {
    expect(handlerFor("export-runners-file")(undefined)).toBe("full export done");
    expect(dbRunners.exportRunnersAsCSV).toHaveBeenCalled();
  });

  it("exports only the unsent records", () => {
    expect(handlerFor("export-incremental-file")(undefined)).toBe("incremental export done");
  });

  it("exports the drops file", () => {
    expect(handlerFor("export-drops-file")(undefined)).toBe("drops export done");
  });

  it("opens the export directory for the operator", () => {
    handlerFor("open-export-dir")(undefined);

    expect(shell.openPath).toHaveBeenCalledWith("/tmp/exports");
  });
});
