import { Readable } from "stream";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { AthleteProgress, DatabaseStatus, DropReason } from "../../../shared/enums";
import { StatusDB } from "../../../shared/models";
import {
  GetPreviousDropped,
  GetStationDropped,
  GetStatusByBib,
  GetTotalDidNotStart,
  GetTotalDropped,
  LoadDrops,
  LoadDropsFromFile,
  SetDrop,
  SetProgress,
  SyncDirection,
  getStoppedHereForBib,
  initStatus,
  insertStatus,
  parseDropsContent,
  syncNoteWithStatus,
  updateDropFromCSV
} from "../status-db";

// Background pushes and file writes resolve on their own microtask/IO turn; allow a generous
// budget so a slow CI runner never turns a correct test into a flake.
const WAIT_FOR_ASYNC_WORK = { timeout: 5000, interval: 10 };

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

const sendToastToRenderer = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/toast-ipc", () => ({ sendToastToRenderer }));

const emitRunnersTableChanged = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/runner-data-emitter", () => ({ emitRunnersTableChanged }));

const pushTimeRecordUpdate = vi.hoisted(() => vi.fn(async () => ({ pushed: true })));
vi.mock("../../services/opensplittime", () => ({ pushTimeRecordUpdate }));

const loadDropsFromCSV = vi.hoisted(() => vi.fn());
vi.mock("../../lib/file-dialogs", () => ({ loadDropsFromCSV }));

function seedStatus(bibId: number) {
  initStatus(bibId);
}

function seedTimeRecord(bibId: number) {
  db.prepare(
    `INSERT INTO TimeRecords (bibId, stationId, timeIn, timeOut, timeModified, note, sent, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(bibId, 3, new Date().toISOString(), null, new Date().toISOString(), "", 0, 0);
}

describe("status-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
    storeMock.data.clear();
    storeMock.data.set("station.id", 3);
    storeMock.data.set("station.identifier", "3-hardware");
    vi.clearAllMocks();
    pushTimeRecordUpdate.mockResolvedValue({ pushed: true });
  });

  afterEach(() => {
    db.close();
  });

  describe("initStatus / insertStatus", () => {
    it("seeds an athlete as incoming and not dropped", () => {
      initStatus(101);

      const [status] = GetStatusByBib(101);
      expect(status).toMatchObject({ bibId: 101, dropped: 0, progress: AthleteProgress.Incoming });
    });

    it("refuses to insert a duplicate status row", () => {
      initStatus(101);

      const [result] = insertStatus({ bibId: 101 } as StatusDB);

      expect(result).toBe(DatabaseStatus.Duplicate);
    });

    it("reports Error when the insert fails", () => {
      db.exec(`DROP TABLE Status`);

      const [result] = insertStatus({ bibId: 101 } as StatusDB);

      expect(result).toBe(DatabaseStatus.Error);
    });
  });

  describe("GetStatusByBib", () => {
    it("reports NotFound for an unknown bib", () => {
      const [status, result] = GetStatusByBib(999);

      expect(status).toBeNull();
      expect(result).toBe(DatabaseStatus.NotFound);
    });

    it("reports Error when the query fails", () => {
      db.exec(`DROP TABLE Status`);

      const [, result] = GetStatusByBib(101);

      expect(result).toBe(DatabaseStatus.Error);
    });
  });

  describe("counts", () => {
    it("counts did-not-start athletes", () => {
      seedStatus(101);
      SetDrop(101, null, true, DropReason.DidNotStart);

      expect(GetTotalDidNotStart()).toBe(1);
    });

    it("counts every dropped athlete", () => {
      seedStatus(101);
      seedStatus(102);
      SetDrop(101, null, true, DropReason.Withdrew);

      expect(GetTotalDropped()).toBe(1);
    });

    it("counts drops recorded at the current station", () => {
      seedStatus(101);
      SetDrop(101, null, true, DropReason.Withdrew);

      expect(GetStationDropped()).toBe(1);
    });

    it("returns the invalid sentinel when no station identifier is set", () => {
      storeMock.data.delete("station.identifier");

      expect(GetStationDropped()).toBe(-999);
    });

    it("counts only drops from stations before the current one", () => {
      seedStatus(101);
      seedStatus(102);
      db.prepare(`UPDATE Status SET dropped = 1, dropStation = '1-start' WHERE bibId = 101`).run();
      db.prepare(`UPDATE Status SET dropped = 1, dropStation = '7-later' WHERE bibId = 102`).run();

      expect(GetPreviousDropped()).toBe(1);
    });

    // `id < stationId` decides "previous": a drop at THIS station must not count, and one at an
    // earlier station must. Without both sides, widening to <= or flipping to >= goes unnoticed.
    it("excludes a drop recorded at the current station from previous drops", () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropStation = '3-hardware' WHERE bibId = 101`
      ).run();

      expect(GetPreviousDropped()).toBe(0);
    });

    it("returns the invalid sentinel for previous drops when the query fails", () => {
      db.exec(`DROP TABLE Status`);

      expect(GetPreviousDropped()).toBe(-999);
    });

    it("returns the invalid sentinel for counts when the query fails", () => {
      db.exec(`DROP TABLE Status`);

      expect(GetTotalDropped()).toBe(-999);
    });
  });

  describe("SetDrop", () => {
    it("records the drop against the current station", () => {
      seedStatus(101);

      const [result] = SetDrop(101, null, true, DropReason.Medical);

      expect(result).toBe(DatabaseStatus.Updated);
      const [status] = GetStatusByBib(101);
      expect(status).toMatchObject({
        dropped: 1,
        dropReason: DropReason.Medical,
        dropStation: "3-hardware"
      });
    });

    it("clears the station and reason when the drop is undone", () => {
      seedStatus(101);
      SetDrop(101, null, true, DropReason.Medical);

      SetDrop(101, null, false, DropReason.None);

      const [status] = GetStatusByBib(101);
      expect(status).toMatchObject({ dropped: 0, dropReason: null, dropStation: null });
    });

    it("uses the supplied time rather than now", () => {
      seedStatus(101);
      const timeOut = new Date("2026-09-01T12:00:00Z");

      SetDrop(101, timeOut, true, DropReason.Withdrew);

      const [status] = GetStatusByBib(101);
      expect(status?.dropDateTime).toBe(timeOut.toISOString());
    });

    it("logs the drop to the event log", () => {
      seedStatus(101);

      SetDrop(101, null, true, DropReason.Withdrew);

      const logs = db.prepare(`SELECT * FROM EventLog WHERE comments LIKE '%Drop%'`).all();
      expect(logs.length).toBeGreaterThan(0);
    });

    it("pushes the change to OpenSplitTime when a timing record exists", async () => {
      seedStatus(101);
      seedTimeRecord(101);

      SetDrop(101, null, true, DropReason.Withdrew);
      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);

      expect(emitRunnersTableChanged).toHaveBeenCalled();
    });

    it("marks the record sent once the push succeeds", async () => {
      seedStatus(101);
      seedTimeRecord(101);

      SetDrop(101, null, true, DropReason.Withdrew);
      await vi.waitFor(() => {
        const row = db.prepare(`SELECT sent FROM TimeRecords WHERE bibId = 101`).get() as {
          sent: number;
        };
        expect(row.sent).toBe(1);
      }, WAIT_FOR_ASYNC_WORK);
    });

    it("leaves the record unsent when the push reports it was skipped", async () => {
      seedStatus(101);
      seedTimeRecord(101);
      pushTimeRecordUpdate.mockResolvedValue({ pushed: false });

      SetDrop(101, null, true, DropReason.Withdrew);
      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);

      const row = db.prepare(`SELECT sent FROM TimeRecords WHERE bibId = 101`).get() as {
        sent: number;
      };
      expect(row.sent).toBe(0);
    });

    it("survives a failed OpenSplitTime push", async () => {
      seedStatus(101);
      seedTimeRecord(101);
      pushTimeRecordUpdate.mockRejectedValue(new Error("network down"));

      const [result] = SetDrop(101, null, true, DropReason.Withdrew);
      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);

      expect(result).toBe(DatabaseStatus.Updated);
    });

    it("never pushes a did-not-start drop", () => {
      seedStatus(101);
      seedTimeRecord(101);

      SetDrop(101, null, true, DropReason.DidNotStart);

      expect(pushTimeRecordUpdate).not.toHaveBeenCalled();
    });

    it("does not push when the dropped value is unchanged", () => {
      seedStatus(101);
      seedTimeRecord(101);
      SetDrop(101, null, true, DropReason.Withdrew);
      pushTimeRecordUpdate.mockClear();

      SetDrop(101, null, true, DropReason.Withdrew);

      expect(pushTimeRecordUpdate).not.toHaveBeenCalled();
    });

    // KNOWN DEFECT - intended behaviour asserted below, currently failing.
    // SetDrop reads the previous drop state before its try/catch, so a database failure escapes
    // instead of being reported as DatabaseStatus.Error the way the guarded writes are.
    // Marked `.fails` so CI stays green; it will start failing once the defect is fixed,
    // at which point the marker should be removed.
    it.fails("reports Error when the database is unavailable", () => {
      seedStatus(101);
      db.exec(`DROP TABLE Status`);

      const [result] = SetDrop(101, null, true, DropReason.Withdrew);

      expect(result).toBe(DatabaseStatus.Error);
    });
  });

  describe("getStoppedHereForBib", () => {
    it("is false when the athlete has not dropped", () => {
      seedStatus(101);

      expect(getStoppedHereForBib(101)).toBe(false);
    });

    it("is true when the drop was recorded at this station", () => {
      seedStatus(101);
      SetDrop(101, null, true, DropReason.Withdrew);

      expect(getStoppedHereForBib(101)).toBe(true);
    });

    it("is false when the drop happened at another station", () => {
      seedStatus(101);
      db.prepare(`UPDATE Status SET dropped = 1, dropStation = '7-later' WHERE bibId = 101`).run();

      expect(getStoppedHereForBib(101)).toBe(false);
    });
  });

  describe("SetProgress", () => {
    it("marks an athlete with no times as incoming", () => {
      seedStatus(101);

      SetProgress(101);

      const [status] = GetStatusByBib(101);
      expect(status?.progress).toBe(AthleteProgress.Incoming);
    });

    it("marks an athlete with only an in time as present", () => {
      seedStatus(101);
      seedTimeRecord(101);

      SetProgress(101);

      const [status] = GetStatusByBib(101);
      expect(status?.progress).toBe(AthleteProgress.Present);
    });

    it("marks an athlete with both times as outgoing", () => {
      seedStatus(101);
      seedTimeRecord(101);
      db.prepare(`UPDATE TimeRecords SET timeOut = ? WHERE bibId = 101`).run(
        new Date().toISOString()
      );

      SetProgress(101);

      const [status] = GetStatusByBib(101);
      expect(status?.progress).toBe(AthleteProgress.Outgoing);
    });

    it("reports NotFound for an unknown bib", () => {
      const [result] = SetProgress(999);

      expect(result).toBe(DatabaseStatus.NotFound);
    });

    it("reports Error when the query fails", () => {
      db.exec(`DROP TABLE Status`);

      const [result] = SetProgress(101);

      expect(result).toBe(DatabaseStatus.Error);
    });
  });

  describe("syncNoteWithStatus", () => {
    it("strips commas from an incoming note", () => {
      seedStatus(101);

      syncNoteWithStatus(101, "sore, tired", -1, SyncDirection.Incoming);

      const [status] = GetStatusByBib(101);
      expect(status?.note).toBe("sore tired");
    });

    it("appends an outgoing note to the existing status note", () => {
      seedStatus(101);
      db.prepare(`UPDATE Status SET note = 'blister' WHERE bibId = 101`).run();

      syncNoteWithStatus(101, "resting", -1, SyncDirection.Outgoing);

      const [status] = GetStatusByBib(101);
      expect(status?.note).toBe("blister resting");
    });

    it("writes the note onto a specific timing record when an index is given", () => {
      seedStatus(101);
      seedTimeRecord(101);
      const { index } = db.prepare(`SELECT "index" FROM TimeRecords WHERE bibId = 101`).get() as {
        index: number;
      };

      syncNoteWithStatus(101, "dropped bottle", index, SyncDirection.Incoming);

      const row = db.prepare(`SELECT note FROM TimeRecords WHERE bibId = 101`).get() as {
        note: string;
      };
      expect(row.note).toBe("dropped bottle");
    });

    it("still records the timing note for an athlete missing from the roster", () => {
      seedTimeRecord(777);
      const { index } = db.prepare(`SELECT "index" FROM TimeRecords WHERE bibId = 777`).get() as {
        index: number;
      };

      const result = syncNoteWithStatus(777, "unknown runner", index, SyncDirection.Incoming);

      expect(result?.[0]).toBe(DatabaseStatus.Updated);
      const row = db.prepare(`SELECT note FROM TimeRecords WHERE bibId = 777`).get() as {
        note: string;
      };
      expect(row.note).toBe("unknown runner");
    });

    it("treats an empty note as clearing the note", () => {
      seedStatus(101);

      syncNoteWithStatus(101, "", -1, SyncDirection.Incoming);

      const [status] = GetStatusByBib(101);
      expect(status?.note).toBe("");
    });
  });

  describe("updateDropFromCSV", () => {
    it("records the drop and its note", () => {
      seedStatus(101);

      const [result] = updateDropFromCSV({
        stationId: "3-hardware",
        bibId: 101,
        dropReason: DropReason.Withdrew,
        dropDateTime: "2026-09-01T12:00:00Z",
        note: "left the course, tired"
      });

      expect(result).toBe(DatabaseStatus.Updated);
      const [status] = GetStatusByBib(101);
      expect(status?.dropped).toBe(1);
      expect(status?.note).toContain("left the course; tired");
    });

    it("reports Error when the update fails", () => {
      db.exec(`DROP TABLE Status`);

      const [result] = updateDropFromCSV({
        stationId: "3-hardware",
        bibId: 101,
        dropReason: DropReason.Withdrew,
        dropDateTime: "2026-09-01T12:00:00Z",
        note: ""
      });

      expect(result).toBe(DatabaseStatus.Error);
    });
  });

  describe("parseDropsContent", () => {
    // The station filter is `dropStationId <= stationId`: a drop recorded at THIS station must
    // import. Without this case, narrowing the comparison to `<` goes unnoticed.
    it("imports a drop recorded at the current station", async () => {
      seedStatus(101);
      const csv = Readable.from(
        ["title row", "header row", "3-hardware,101,withdrew,2026-09-01T12:00:00Z,"].join("\n")
      );

      await parseDropsContent(csv, "drops.csv");

      expect(GetStatusByBib(101)[0]?.dropped).toBe(1);
    });

    it("reports exactly how many drops it processed and imported", async () => {
      seedStatus(101);
      const csv = Readable.from(
        [
          "title row",
          "header row",
          "1-start,101,did-not-start,2026-09-01T06:00:00Z,",
          "9-later,102,withdrew,2026-09-01T12:00:00Z,"
        ].join("\n")
      );

      const message = await parseDropsContent(csv, "drops.csv");

      expect(message).toContain("2 dropRecords processed, 1 imported");
    });

    it("imports drops from this station and earlier ones", async () => {
      seedStatus(101);
      seedStatus(102);
      const csv = Readable.from(
        [
          "title row",
          "header row",
          "1-start,101,did-not-start,2026-09-01T06:00:00Z,",
          "9-later,102,withdrew,2026-09-01T12:00:00Z,"
        ].join("\n")
      );

      const message = await parseDropsContent(csv, "drops.csv");

      expect(message).toContain("1 imported");
      expect(GetStatusByBib(101)[0]?.dropped).toBe(1);
      expect(GetStatusByBib(102)[0]?.dropped).toBe(0);
    });

    it("reports a parse failure to the operator", async () => {
      const csv = Readable.from(["title", "header", '1-start,101,"unterminated'].join("\n"));

      await expect(parseDropsContent(csv, "drops.csv")).rejects.toThrow(/Quote Not Closed/);
      expect(sendToastToRenderer).toHaveBeenCalledWith(expect.objectContaining({ type: "danger" }));
    });
  });

  describe("LoadDrops", () => {
    it("throws when the operator cancels the dialog", async () => {
      loadDropsFromCSV.mockResolvedValue(undefined);

      await expect(LoadDrops()).rejects.toThrow("No drops file selected");
    });

    it("imports the chosen drops file", async () => {
      const fs = await import("fs");
      const os = await import("os");
      const path = await import("path");
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-drops-"));
      const file = path.join(dir, "drops.csv");
      fs.writeFileSync(file, "title\nheader\n1-start,101,did-not-start,2026-09-01T06:00:00Z,\n");
      seedStatus(101);
      loadDropsFromCSV.mockResolvedValue([file]);

      await LoadDrops();

      expect(GetStatusByBib(101)[0]?.dropped).toBe(1);
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("imports drops straight from a path", async () => {
      const fs = await import("fs");
      const os = await import("os");
      const path = await import("path");
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-drops-"));
      const file = path.join(dir, "drops.csv");
      fs.writeFileSync(file, "title\nheader\n1-start,202,withdrew,2026-09-01T06:00:00Z,\n");
      seedStatus(202);

      await LoadDropsFromFile(file);

      expect(GetStatusByBib(202)[0]?.dropped).toBe(1);
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });
});
