import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { DatabaseStatus, DropReason } from "../../../shared/enums";
import { generateStartLineDrops, previewStartLineDrops } from "../startLineDrops-db";
import { initStatus } from "../status-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({
  getDatabaseConnection: () => db
}));

const storeMock = vi.hoisted(() => {
  const data = new Map<string, unknown>();
  return {
    data,
    get: vi.fn((key: string) => data.get(key)),
    set: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    })
  };
});
vi.mock("../../lib/store", () => ({ appStore: storeMock }));

const setOpenSplitTimePushPaused = vi.hoisted(() => vi.fn());
const pushTimeRecordUpdate = vi.hoisted(() => vi.fn(async () => ({ pushed: true })));
vi.mock("../../services/opensplittime", () => ({
  setOpenSplitTimePushPaused,
  pushTimeRecordUpdate
}));

const sendToastToRenderer = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/toast-ipc", () => ({ sendToastToRenderer }));

const emitRunnersTableChanged = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/runner-data-emitter", () => ({ emitRunnersTableChanged }));

const exportDropsAsCSV = vi.hoisted(() => vi.fn(async () => "File Export Successful: drops.csv"));
vi.mock("../runners-db", () => ({ exportDropsAsCSV }));

vi.mock("../../lib/file-dialogs", () => ({ loadDropsFromCSV: vi.fn(), saveDropsToCSV: vi.fn() }));

function seedAthlete(bibId: number) {
  db.prepare(`INSERT INTO Athletes (bibId, firstName, lastName) VALUES (?, ?, ?)`).run(
    bibId,
    `First${bibId}`,
    `Last${bibId}`
  );
  initStatus(bibId);
}

function seedTimeRecord(bibId: number, stationId: number, status = 0) {
  db.prepare(
    `INSERT INTO TimeRecords (bibId, stationId, timeIn, timeOut, timeModified, note, sent, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(bibId, stationId, new Date().toISOString(), null, new Date().toISOString(), "", 0, status);
}

describe("startLineDrops-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
    storeMock.data.clear();
    storeMock.data.set("station.id", 0);
    storeMock.data.set("station.identifier", "0-start-line");
    storeMock.data.set("event.startline", "0-start-line");
    storeMock.data.set("event.starttime", "2026-09-25T05:00:00.000Z");
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  describe("previewStartLineDrops", () => {
    it("errors when the current station is not the start line", () => {
      storeMock.data.set("station.identifier", "1-aid-station");

      const [preview, status] = previewStartLineDrops();

      expect(preview).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
    });

    it("counts registered, started, already-dropped, and new DNS drops", () => {
      seedAthlete(101);
      seedAthlete(102);
      seedAthlete(103);
      seedTimeRecord(101, 0);

      db.prepare(`UPDATE Status SET dropped = 1, dropReason = ? WHERE bibId = ?`).run(
        DropReason.Withdrew,
        102
      );

      const [preview, status] = previewStartLineDrops();

      expect(status).toBe(DatabaseStatus.Success);
      expect(preview).toMatchObject({
        registeredCount: 3,
        startedCount: 1,
        alreadyDroppedCount: 1,
        newDropCount: 1,
        duplicateBibIds: [],
        unknownBibIds: []
      });
    });

    it("reports duplicate start line records", () => {
      seedAthlete(101);
      seedTimeRecord(101, 0, 1);

      const [preview] = previewStartLineDrops();

      expect(preview?.duplicateBibIds).toEqual([101]);
    });

    it("reports unknown bibs recorded at the start line but not in Athletes", () => {
      seedTimeRecord(999, 0);

      const [preview] = previewStartLineDrops();

      expect(preview?.unknownBibIds).toEqual([999]);
    });
  });

  describe("generateStartLineDrops", () => {
    it("blocks when duplicate start line records exist", async () => {
      seedAthlete(101);
      seedTimeRecord(101, 0, 1);

      const [report, status, message] = await generateStartLineDrops();

      expect(report).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toMatch(/duplicate/i);
      expect(setOpenSplitTimePushPaused).not.toHaveBeenCalled();
    });

    it("blocks when unknown bibs have started but are not registered", async () => {
      seedTimeRecord(999, 0);

      const [report, status, message] = await generateStartLineDrops();

      expect(report).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toMatch(/reload the event file/i);
    });

    it("pauses OST push, drops non-starters as DNS, and exports the drops CSV", async () => {
      seedAthlete(101);
      seedAthlete(102);
      seedTimeRecord(101, 0);

      const [report, status] = await generateStartLineDrops();

      expect(status).toBe(DatabaseStatus.Success);
      expect(report?.newDropCount).toBe(1);
      expect(setOpenSplitTimePushPaused).toHaveBeenCalledWith(true);
      expect(exportDropsAsCSV).toHaveBeenCalled();

      const droppedStatus = db.prepare(`SELECT * FROM Status WHERE bibId = ?`).get(102) as {
        dropped: number;
        dropReason: string;
        dropStation: string;
        dropDateTime: string;
      };

      expect(droppedStatus).toMatchObject({
        dropped: 1,
        dropReason: DropReason.DidNotStart,
        dropStation: "0-start-line",
        dropDateTime: "2026-09-25T05:00:00.000Z"
      });
    });
  });
});
