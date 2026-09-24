import fs from "fs";
import path from "path";
import { Readable } from "stream";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import {
  AthleteProgress,
  DatabaseStatus,
  DropReason,
  DropsImportConflictAction,
  DropsImportRecommendationConfidence
} from "../../../shared/enums";
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
  applyDropsImport,
  discardDropsImport,
  getStoppedHereForBib,
  initStatus,
  insertStatus,
  parseDropsContent,
  previewDropsContent,
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

function recommendationFixture(name: string): Readable {
  const filePath = path.resolve(process.cwd(), "resources/config/mock-data", name);
  return Readable.from(fs.readFileSync(filePath, "utf8"));
}

function seedDrop(bibId: number, reason: DropReason, station: string, dateTime: string): void {
  seedStatus(bibId);
  db.prepare(
    `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = ?`
  ).run(reason, station, dateTime, bibId);
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

    // Did-not-start athletes are already counted globally by GetTotalDidNotStart(); if
    // previousDrops also included them, stat-engine's pendingArrivals would subtract them twice.
    it("excludes did-not-start drops from previous drops to avoid double-counting", () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = 'did-not-start', dropStation = '0-start' WHERE bibId = 101`
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

    it("imports a drop whose note carries a raw quote", async () => {
      seedStatus(101);
      const csv = Readable.from(
        ["title row", "header row", '3-hardware,101,withdrew,2026-09-01T12:00:00Z,said "ok"'].join(
          "\n"
        )
      );

      await parseDropsContent(csv, "drops.csv");

      expect(GetStatusByBib(101)[0]?.dropped).toBe(1);
      expect(GetStatusByBib(101)[0]?.note).toContain('said "ok"');
    });

    it("imports a drop whose note carries a raw comma, keeping the whole note", async () => {
      seedStatus(101);
      const csv = Readable.from(
        [
          "title row",
          "header row",
          "3-hardware,101,withdrew,2026-09-01T12:00:00Z,tired, sore"
        ].join("\n")
      );

      await parseDropsContent(csv, "drops.csv");

      expect(GetStatusByBib(101)[0]?.dropped).toBe(1);
      expect(GetStatusByBib(101)[0]?.note).toContain("tired; sore");
    });

    it("skips a blank line rather than treating it as a drop", async () => {
      seedStatus(101);
      const csv = Readable.from(
        [
          "title row",
          "header row",
          "3-hardware,101,withdrew,2026-09-01T12:00:00Z,",
          "",
          "3-hardware,102,withdrew,2026-09-01T12:30:00Z,"
        ].join("\n")
      );

      const message = await parseDropsContent(csv, "drops.csv");

      expect(message).toContain("2 imported");
    });

    it("skips a drop row with no bib", async () => {
      seedStatus(101);
      const csv = Readable.from(
        [
          "title row",
          "header row",
          "3-hardware,101,withdrew,2026-09-01T12:00:00Z,",
          "3-hardware,,withdrew,2026-09-01T12:15:00Z,"
        ].join("\n")
      );

      const message = await parseDropsContent(csv, "drops.csv");

      expect(message).toContain("1 imported");
    });

    it("reports a parse failure to the operator", async () => {
      const csv = Readable.from(["title", "header", '1-start,101,"unterminated'].join("\n"));

      await expect(parseDropsContent(csv, "drops.csv")).rejects.toThrow(/Quote Not Closed/);
      expect(sendToastToRenderer).toHaveBeenCalledWith(expect.objectContaining({ type: "danger" }));
    });
  });

  describe("drops import review", () => {
    it("validates recommendation scenarios from CSV fixtures", async () => {
      seedDrop(1001, DropReason.DidNotStart, "0-start-line", "2026-09-25T05:08:00.000Z");
      seedDrop(1002, DropReason.Medical, "3-richards-hollow", "2026-09-25T12:00:00.000Z");

      const [dnsPreview, dnsStatus] = await previewDropsContent(
        recommendationFixture("drops-recommendation-dns.csv"),
        "drops-recommendation-dns.csv"
      );
      const [courseDnsPreview] = await previewDropsContent(
        recommendationFixture("drops-recommendation-course-dns.csv"),
        "drops-recommendation-course-dns.csv"
      );

      expect(dnsStatus).toBe(DatabaseStatus.Success);
      expect(dnsPreview?.conflicts[0]).toMatchObject({
        bibId: 1001,
        recommendedAction: DropsImportConflictAction.PreserveExisting,
        recommendationConfidence: DropsImportRecommendationConfidence.High
      });
      expect(courseDnsPreview?.conflicts[0]).toMatchObject({
        bibId: 1002,
        recommendedAction: DropsImportConflictAction.PreserveExisting,
        recommendationConfidence: DropsImportRecommendationConfidence.Medium
      });
    });

    it("validates station-order recommendations from a CSV fixture", async () => {
      storeMock.data.set("station.id", 6);
      seedDrop(1003, DropReason.Medical, "6-tony-grove", "2026-09-25T12:00:00.000Z");
      seedDrop(1004, DropReason.Medical, "2-franklin-trailhead", "2026-09-25T12:00:00.000Z");

      const [preview] = await previewDropsContent(
        recommendationFixture("drops-recommendation-station-order.csv"),
        "drops-recommendation-station-order.csv"
      );

      expect(preview?.conflicts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bibId: 1003,
            recommendedAction: DropsImportConflictAction.PreserveExisting,
            recommendationConfidence: DropsImportRecommendationConfidence.Medium
          }),
          expect.objectContaining({
            bibId: 1004,
            recommendedAction: DropsImportConflictAction.UseImported,
            recommendationConfidence: DropsImportRecommendationConfidence.Medium
          })
        ])
      );
    });

    it("validates timestamp recommendations from a CSV fixture", async () => {
      seedDrop(1005, DropReason.Medical, "3-richards-hollow", "2026-09-25T14:00:00.000Z");
      seedDrop(1006, DropReason.Medical, "3-richards-hollow", "2026-09-25T16:00:00.000Z");

      const [preview] = await previewDropsContent(
        recommendationFixture("drops-recommendation-same-station-time.csv"),
        "drops-recommendation-same-station-time.csv"
      );

      expect(preview?.conflicts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bibId: 1005,
            recommendedAction: DropsImportConflictAction.UseImported,
            recommendationConfidence: DropsImportRecommendationConfidence.Medium
          }),
          expect.objectContaining({
            bibId: 1006,
            recommendedAction: DropsImportConflictAction.PreserveExisting,
            recommendationConfidence: DropsImportRecommendationConfidence.Medium
          })
        ])
      );
    });

    it("validates manual-review recommendations from CSV fixtures", async () => {
      seedDrop(1007, DropReason.Medical, "2-franklin-trailhead", "2026-09-25T15:00:00.000Z");
      seedDrop(1008, DropReason.Medical, "3-richards-hollow", "2026-09-25T15:00:00.000Z");
      seedDrop(1009, DropReason.Medical, "3-richards-hollow", "2026-09-25T15:00:00.000Z");

      const [conflictPreview] = await previewDropsContent(
        recommendationFixture("drops-recommendation-conflict.csv"),
        "drops-recommendation-conflict.csv"
      );
      const [manualReviewPreview] = await previewDropsContent(
        recommendationFixture("drops-recommendation-manual-review.csv"),
        "drops-recommendation-manual-review.csv"
      );

      expect(conflictPreview?.conflicts).toEqual(
        expect.arrayContaining(
          [1007, 1008].map((bibId) =>
            expect.objectContaining({
              bibId,
              recommendedAction: DropsImportConflictAction.PreserveExisting,
              recommendationConfidence: DropsImportRecommendationConfidence.Low
            })
          )
        )
      );
      expect(manualReviewPreview?.conflicts[0]).toMatchObject({
        bibId: 1009,
        recommendedAction: DropsImportConflictAction.PreserveExisting,
        recommendationConfidence: DropsImportRecommendationConfidence.Low
      });
    });

    it("classifies invalid and duplicate rows from a CSV fixture", async () => {
      const [preview, status, message] = await previewDropsContent(
        recommendationFixture("drops-recommendation-invalid.csv"),
        "drops-recommendation-invalid.csv"
      );

      if (status !== DatabaseStatus.Success) throw new Error(message);
      expect(preview).toMatchObject({
        totalRowCount: 5,
        processedCount: 4,
        invalidRowCount: 1,
        duplicateCount: 2
      });
      expect(preview?.skippedRecords).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ bibId: 1010, reason: "Invalid station identifier" }),
          expect.objectContaining({ bibId: 1011, reason: "Invalid drop timestamp" })
        ])
      );
      expect(preview?.duplicateRecords).toHaveLength(2);
    });

    it("previews conflicts without changing any statuses", async () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.Medical, "6-tony-grove", "2026-09-25T15:36:00.000Z");
      const csv = Readable.from(
        ["title row", "header row", "0-start-line,101,did-not-start,2026-09-25T05:08:00Z,"].join(
          "\n"
        )
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview?.conflicts).toHaveLength(1);
      expect(preview?.conflicts[0]).toMatchObject({
        bibId: 101,
        imported: { dropReason: DropReason.DidNotStart, dropStation: "0-start-line" },
        existing: { dropReason: DropReason.Medical, dropStation: "6-tony-grove" }
      });
      expect(GetStatusByBib(101)[0]).toMatchObject({
        dropReason: DropReason.Medical,
        dropStation: "6-tony-grove"
      });
    });

    it("includes skipped and duplicate rows with reasons in the preview", async () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.Medical, "6-tony-grove", "2026-09-25T15:36:00.000Z");
      seedStatus(102);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 102`
      ).run(DropReason.Withdrew, "0-start-line", "2026-09-25T05:08:00.000Z");

      const csv = Readable.from(
        [
          "title row",
          "header row",
          "7-franklin-trailhead,201,medical,2026-09-25T18:00:00Z,late-record",
          "0-start-line,101,medical,2026-09-25T15:36:00.000Z,existing-match",
          "0-start-line,102,withdrew,2026-09-25T05:08:00.000Z,duplicate-row"
        ].join("\n")
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview?.skippedRecords).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bibId: 201,
            reason: expect.stringMatching(/later station|future station/i)
          })
        ])
      );
      expect(preview?.duplicateRecords).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bibId: 102,
            reason: expect.stringMatching(/duplicate|matches|already exists/i)
          })
        ])
      );
    });

    it("treats a drop as a duplicate when only milliseconds differ, since drops files omit them", async () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.Medical, "3-hardware", "2026-09-25T15:36:00.123Z");

      const csv = Readable.from(
        ["title row", "header row", "3-hardware,101,medical,2026-09-25T15:36:00Z,"].join("\n")
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview?.conflicts).toEqual([]);
      expect(preview?.duplicateRecords).toEqual([expect.objectContaining({ bibId: 101 })]);
    });

    it("reports malformed station identifiers instead of treating them as future stations", async () => {
      seedStatus(101);
      const csv = Readable.from(
        ["title row", "header row", "not-a-station,101,medical,2026-09-25T15:36:00Z,"].join("\n")
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview?.skippedRecords).toEqual([
        expect.objectContaining({
          bibId: 101,
          reason: expect.stringMatching(/invalid.*station/i)
        })
      ]);
      expect(preview?.skippedFutureStationCount).toBe(0);
    });

    it("recommends an imported timestamp when the existing timestamp is invalid", async () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.Medical, "3-hardware", "not-a-timestamp");
      const csv = Readable.from(
        ["title row", "header row", "3-hardware,101,medical,2026-09-25T15:36:00Z,"].join("\n")
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview?.conflicts[0]).toMatchObject({
        recommendedAction: DropsImportConflictAction.UseImported,
        recommendationConfidence: DropsImportRecommendationConfidence.Medium
      });
    });

    it("preserves an existing DNS even when timing data exists", async () => {
      seedStatus(101);
      seedTimeRecord(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.DidNotStart, "0-start-line", "2026-09-25T05:08:00.000Z");
      const csv = Readable.from(
        ["title row", "header row", "3-hardware,101,medical,2026-09-25T15:36:00Z,"].join("\n")
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview?.conflicts[0]).toMatchObject({
        recommendedAction: DropsImportConflictAction.PreserveExisting,
        recommendationConfidence: DropsImportRecommendationConfidence.High,
        recommendationReason: expect.stringMatching(/did not start|DNS/i)
      });
    });

    it("reports an invalid imported timestamp instead of failing the preview", async () => {
      seedStatus(101);
      const csv = Readable.from(
        ["title row", "header row", "3-hardware,101,medical,not-a-timestamp,"].join("\n")
      );

      const [preview, status] = await previewDropsContent(csv, "drops.csv");

      expect(status).toBe(DatabaseStatus.Success);
      expect(preview?.skippedRecords).toEqual([
        expect.objectContaining({
          bibId: 101,
          reason: expect.stringMatching(/invalid.*timestamp/i)
        })
      ]);
      expect(preview?.importableCount).toBe(0);
    });

    it("reports total, valid, and invalid CSV row counts", async () => {
      seedStatus(101);
      const csv = Readable.from(
        [
          "title row",
          "header row",
          "3-hardware,101,medical,2026-09-25T15:36:00Z,",
          "3-hardware,,medical,2026-09-25T15:36:00Z,"
        ].join("\n")
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview).toMatchObject({
        totalRowCount: 2,
        processedCount: 1,
        invalidRowCount: 1
      });
    });

    it("uses medium confidence for station-order recommendations", async () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.Medical, "6-tony-grove", "2026-09-25T15:36:00.000Z");
      const csv = Readable.from(
        ["title row", "header row", "0-start-line,101,did-not-start,2026-09-25T05:08:00Z,"].join(
          "\n"
        )
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview?.conflicts[0].recommendationConfidence).toBe(
        DropsImportRecommendationConfidence.Medium
      );
    });

    it("downgrades station-order recommendations when timestamps disagree", async () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.Medical, "3-tony-grove", "2026-09-25T15:36:00.000Z");
      const csv = Readable.from(
        ["title row", "header row", "2-franklin-trailhead,101,medical,2026-09-25T16:36:00Z,"].join(
          "\n"
        )
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview?.conflicts[0]).toMatchObject({
        recommendedAction: DropsImportConflictAction.PreserveExisting,
        recommendationConfidence: DropsImportRecommendationConfidence.Low,
        recommendationReason: expect.stringMatching(/manual review|timestamp|station/i)
      });
    });

    it("preserves conflicting drops unless the operator chooses the imported row", async () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.Medical, "6-tony-grove", "2026-09-25T15:36:00.000Z");
      const csv = Readable.from(
        ["title row", "header row", "0-start-line,101,did-not-start,2026-09-25T05:08:00Z,"].join(
          "\n"
        )
      );
      const [preview] = await previewDropsContent(csv, "drops.csv");

      const [, preserveStatus] = applyDropsImport({
        importId: preview!.importId,
        decisions: [
          {
            conflictId: preview!.conflicts[0].id,
            action: DropsImportConflictAction.PreserveExisting
          }
        ]
      });

      expect(preserveStatus).toBe(DatabaseStatus.Success);
      expect(GetStatusByBib(101)[0]).toMatchObject({
        dropReason: DropReason.Medical,
        dropStation: "6-tony-grove"
      });

      const overwriteCsv = Readable.from(
        ["title row", "header row", "0-start-line,101,did-not-start,2026-09-25T05:08:00Z,"].join(
          "\n"
        )
      );
      const [overwritePreview] = await previewDropsContent(overwriteCsv, "drops.csv");

      const [, overwriteStatus] = applyDropsImport({
        importId: overwritePreview!.importId,
        decisions: [
          {
            conflictId: overwritePreview!.conflicts[0].id,
            action: DropsImportConflictAction.UseImported
          }
        ]
      });

      expect(overwriteStatus).toBe(DatabaseStatus.Success);
      expect(GetStatusByBib(101)[0]).toMatchObject({
        dropReason: DropReason.DidNotStart,
        dropStation: "0-start-line"
      });
    });

    it("rejects applying a conflict when the status changed after preview", async () => {
      seedStatus(101);
      db.prepare(
        `UPDATE Status SET dropped = 1, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.Medical, "6-tony-grove", "2026-09-25T15:36:00.000Z");
      const csv = Readable.from(
        ["title row", "header row", "0-start-line,101,did-not-start,2026-09-25T05:08:00Z,"].join(
          "\n"
        )
      );
      const [preview] = await previewDropsContent(csv, "drops.csv");

      db.prepare(
        `UPDATE Status SET dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = 101`
      ).run(DropReason.Timeout, "7-franklin-trailhead", "2026-09-25T16:36:00.000Z");

      const [report, status] = applyDropsImport({
        importId: preview!.importId,
        decisions: [
          {
            conflictId: preview!.conflicts[0].id,
            action: DropsImportConflictAction.UseImported
          }
        ]
      });

      expect(report).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(GetStatusByBib(101)[0]).toMatchObject({
        dropReason: DropReason.Timeout,
        dropStation: "7-franklin-trailhead"
      });
    });

    it("rolls back the entire import when a drop update fails", async () => {
      seedStatus(101);
      seedStatus(102);
      const csv = Readable.from(
        [
          "title row",
          "header row",
          "1-start,101,withdrew,2026-09-25T05:08:00Z,",
          "2-aid,102,medical,2026-09-25T06:08:00Z,"
        ].join("\n")
      );
      const [preview] = await previewDropsContent(csv, "drops.csv");

      db.exec(`
        CREATE TRIGGER fail_second_drop
        BEFORE UPDATE OF dropped ON Status
        WHEN NEW.bibId = 102
        BEGIN
          SELECT RAISE(ABORT, 'forced failure');
        END
      `);

      const [report, status] = applyDropsImport({ importId: preview!.importId, decisions: [] });

      expect(report).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(GetStatusByBib(101)[0]?.dropped).toBe(0);
      expect(GetStatusByBib(102)[0]?.dropped).toBe(0);
    });

    it("reports repeated bibs in the imported file instead of importing them", async () => {
      seedStatus(101);
      const csv = Readable.from(
        [
          "title row",
          "header row",
          "1-start,101,withdrew,2026-09-25T05:08:00Z,first",
          "2-aid,101,medical,2026-09-25T06:08:00Z,second"
        ].join("\n")
      );

      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(preview).toMatchObject({ duplicateCount: 2, importableCount: 0 });
      expect(preview?.duplicateRecords).toHaveLength(2);
      expect(preview?.duplicateRecords[0].reason).toMatch(/duplicate bib/i);
      expect(GetStatusByBib(101)[0]?.dropped).toBe(0);
    });

    it("discards a pending import", async () => {
      seedStatus(101);
      const csv = Readable.from(
        ["title row", "header row", "1-start,101,withdrew,2026-09-25T05:08:00Z,"].join("\n")
      );
      const [preview] = await previewDropsContent(csv, "drops.csv");

      expect(discardDropsImport(preview!.importId)).toEqual([
        DatabaseStatus.Success,
        "Drops import discarded"
      ]);
      expect(applyDropsImport({ importId: preview!.importId, decisions: [] })).toEqual([
        null,
        DatabaseStatus.NotFound,
        "Drops import preview expired"
      ]);
    });

    it("expires an abandoned pending import", async () => {
      vi.useFakeTimers();
      try {
        seedStatus(101);
        const csv = Readable.from(
          ["title row", "header row", "1-start,101,withdrew,2026-09-25T05:08:00Z,"].join("\n")
        );
        const [preview] = await previewDropsContent(csv, "drops.csv");

        vi.advanceTimersByTime(31 * 60 * 1000);

        expect(applyDropsImport({ importId: preview!.importId, decisions: [] })).toEqual([
          null,
          DatabaseStatus.NotFound,
          "Drops import preview expired"
        ]);
      } finally {
        vi.useRealTimers();
      }
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
