import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseStatus } from "../../../shared/enums";
import { initRunnerFormHandlers } from "../runnerform-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const dbRunners = vi.hoisted(() => ({ readRunnersTable: vi.fn() }));
vi.mock("../../database/runners-db", () => dbRunners);

const dbTimings = vi.hoisted(() => ({
  insertOrUpdateTimeRecord: vi.fn(() => [DatabaseStatus.Created, "created"]),
  deleteTimeRecord: vi.fn(() => [DatabaseStatus.Deleted, "deleted"]),
  isBibDuplicate: vi.fn(() => [false, DatabaseStatus.Success, "no duplicates"])
}));
vi.mock("../../database/timingRecords-db", () => dbTimings);

const Calculate = vi.hoisted(() => vi.fn());
vi.mock("../../lib/stat-engine", () => ({ Calculate }));

const getOpenSplitTimePushStatus = vi.hoisted(() => vi.fn());
vi.mock("../../services/opensplittime", () => ({ getOpenSplitTimePushStatus }));

function handlerFor(channel: string) {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new Error(`${channel} handler was not registered`);
  return handler;
}

describe("runnerform-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    getOpenSplitTimePushStatus.mockReturnValue(undefined);
    initRunnerFormHandlers();
  });

  describe("get-runners-table", () => {
    it("returns the runners table", () => {
      dbRunners.readRunnersTable.mockReturnValue([[{ bibId: 101 }], DatabaseStatus.Success, ""]);

      const [rows] = handlerFor("get-runners-table")(undefined, { includeDrops: true }) as [
        Array<{ bibId: number }>
      ];

      expect(rows).toHaveLength(1);
    });

    it("decorates each runner with its OpenSplitTime push state", () => {
      dbRunners.readRunnersTable.mockReturnValue([[{ bibId: 101 }], DatabaseStatus.Success, ""]);
      getOpenSplitTimePushStatus.mockReturnValue({ status: "error", error: "rejected" });

      const [rows] = handlerFor("get-runners-table")(undefined, { includeDrops: true }) as [
        Array<{ openSplitTimePushStatus: string; openSplitTimePushError: string }>
      ];

      expect(rows[0].openSplitTimePushStatus).toBe("error");
      expect(rows[0].openSplitTimePushError).toBe("rejected");
    });

    it("copes with an empty result", () => {
      dbRunners.readRunnersTable.mockReturnValue([null, DatabaseStatus.NotFound, ""]);

      expect(() =>
        handlerFor("get-runners-table")(undefined, { includeDrops: false })
      ).not.toThrow();
    });
  });

  describe("add-timing-record", () => {
    it("stores the record and recalculates the stats", () => {
      const result = handlerFor("add-timing-record")(undefined, { bibId: 101 });

      expect(dbTimings.insertOrUpdateTimeRecord).toHaveBeenCalled();
      expect(Calculate).toHaveBeenCalled();
      expect(result).toEqual([DatabaseStatus.Created, "created"]);
    });

    it("uses the same handler for edits", () => {
      handlerFor("edit-timing-record")(undefined, { bibId: 101 });

      expect(dbTimings.insertOrUpdateTimeRecord).toHaveBeenCalled();
    });
  });

  describe("delete-timing-record", () => {
    it("deletes the record and recalculates the stats", () => {
      const result = handlerFor("delete-timing-record")(undefined, { bibId: 101 });

      expect(dbTimings.deleteTimeRecord).toHaveBeenCalled();
      expect(Calculate).toHaveBeenCalled();
      expect(result).toEqual([DatabaseStatus.Deleted, "deleted"]);
    });
  });

  describe("is-duplicate-bib", () => {
    it("asks the database whether the bib is already recorded", () => {
      const result = handlerFor("is-duplicate-bib")(undefined, { bibId: 101, index: 4 });

      expect(dbTimings.isBibDuplicate).toHaveBeenCalledWith(101, 4);
      expect(result).toEqual([false, DatabaseStatus.Success, "no duplicates"]);
    });
  });
});
