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
const getAuthStatus = vi.hoisted(() => vi.fn(() => ({ authenticated: true, expiration: null })));
vi.mock("../../services/opensplittime", () => ({
  setOpenSplitTimePushPaused,
  pushTimeRecordUpdate,
  getAuthStatus
}));

const sendToastToRenderer = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/toast-ipc", () => ({ sendToastToRenderer }));

const emitRunnersTableChanged = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/runner-data-emitter", () => ({ emitRunnersTableChanged }));

const exportDropsAsCSV = vi.hoisted(() => vi.fn(async () => "File Export Successful: drops.csv"));
vi.mock("../runners-db", () => ({ exportDropsAsCSV }));

const IsRFIDScanning = vi.hoisted(() => vi.fn(() => false));
vi.mock("../../api/rfid-processor", () => ({ IsRFIDScanning }));

vi.mock("../../lib/file-dialogs", () => ({ loadDropsFromCSV: vi.fn(), saveDropsToCSV: vi.fn() }));

function seedAthlete(bibId: number) {
  db.prepare(`INSERT INTO Athletes (bibId, firstName, lastName) VALUES (?, ?, ?)`).run(
    bibId,
    `First${bibId}`,
    `Last${bibId}`
  );
  initStatus(bibId);
}

function seedTimeRecord(
  bibId: number,
  stationId: number,
  status = 0,
  timeIn: string | null = new Date().toISOString(),
  timeOut: string | null = null
) {
  db.prepare(
    `INSERT INTO TimeRecords (bibId, stationId, timeIn, timeOut, timeModified, note, sent, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(bibId, stationId, timeIn, timeOut, new Date().toISOString(), "", 0, status);
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

    it("treats an out-only entry (no timeIn) as started, not a DNS candidate", () => {
      // Start line "Out" button entries record only timeOut; timeIn stays null.
      seedAthlete(101);
      seedAthlete(102);
      seedTimeRecord(101, 0, 0, null, new Date().toISOString());

      const [preview] = previewStartLineDrops();

      expect(preview).toMatchObject({ startedCount: 1, newDropCount: 1 });
    });

    it("errors when RFID is still scanning", () => {
      IsRFIDScanning.mockReturnValueOnce(true);

      const [preview, status, message] = previewStartLineDrops();

      expect(preview).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toMatch(/rfid/i);
    });
  });

  describe("generateStartLineDrops", () => {
    it("errors when RFID is still scanning", async () => {
      IsRFIDScanning.mockReturnValueOnce(true);

      const [report, status, message] = await generateStartLineDrops(true);

      expect(report).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toMatch(/rfid/i);
    });

    it("errors when the start line closure isn't confirmed", async () => {
      seedAthlete(101);

      const [report, status, message] = await generateStartLineDrops(false);

      expect(report).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toMatch(/confirm/i);
      expect(setOpenSplitTimePushPaused).not.toHaveBeenCalled();
    });

    it("blocks when duplicate start line records exist", async () => {
      seedAthlete(101);
      seedTimeRecord(101, 0, 1);

      const [report, status, message] = await generateStartLineDrops(true);

      expect(report).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toMatch(/duplicate/i);
      expect(setOpenSplitTimePushPaused).not.toHaveBeenCalled();
    });

    it("blocks when unknown bibs have started but are not registered", async () => {
      seedTimeRecord(999, 0);

      const [report, status, message] = await generateStartLineDrops(true);

      expect(report).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toMatch(/reload the event file/i);
    });

    it("pauses OST push, drops non-starters as DNS, and exports the drops CSV", async () => {
      seedAthlete(101);
      seedAthlete(102);
      seedTimeRecord(101, 0);

      const [report, status] = await generateStartLineDrops(true);

      expect(status).toBe(DatabaseStatus.Success);
      expect(report?.newDropCount).toBe(1);
      expect(report?.exportStatus).toBe("success");
      expect(setOpenSplitTimePushPaused).toHaveBeenCalledWith(true);
      expect(exportDropsAsCSV).toHaveBeenCalled();
      expect(emitRunnersTableChanged).toHaveBeenCalled();

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

      // The dropped bib gets its own TimeRecords row (auto-assigned sequence number) so it
      // shows up in the runner grid, with in/out times set to the drop time (event start time).
      const timeRecord = db.prepare(`SELECT * FROM TimeRecords WHERE bibId = ?`).get(102) as {
        index: number;
        timeIn: string | null;
        timeOut: string | null;
      };

      expect(timeRecord.index).toBeGreaterThan(0);
      expect(timeRecord.timeIn).toBe("2026-09-25T05:00:00.000Z");
      expect(timeRecord.timeOut).toBe("2026-09-25T05:00:00.000Z");
    });

    it("skips pausing OST when signed out, since pushes are already paused", async () => {
      getAuthStatus.mockReturnValueOnce({ authenticated: false, expiration: null });
      seedAthlete(101);

      const [report, status] = await generateStartLineDrops(true);

      expect(status).toBe(DatabaseStatus.Success);
      expect(report?.newDropCount).toBe(1);
      expect(setOpenSplitTimePushPaused).not.toHaveBeenCalled();
    });

    it("reports a cancelled export separately from the DB commit succeeding", async () => {
      exportDropsAsCSV.mockResolvedValueOnce("Invalid file name");
      seedAthlete(101);

      const [report, status] = await generateStartLineDrops(true);

      expect(status).toBe(DatabaseStatus.Success);
      expect(report?.newDropCount).toBe(1);
      expect(report?.exportStatus).toBe("cancelled");
    });

    it("reports a failed export separately from the DB commit succeeding", async () => {
      exportDropsAsCSV.mockResolvedValueOnce("Disk is full");
      seedAthlete(101);

      const [report, status] = await generateStartLineDrops(true);

      expect(status).toBe(DatabaseStatus.Success);
      expect(report?.newDropCount).toBe(1);
      expect(report?.exportStatus).toBe("error");
    });
  });
});
