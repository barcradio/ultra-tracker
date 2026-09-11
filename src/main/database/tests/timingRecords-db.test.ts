import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { DatabaseStatus, EntryMode, RecordStatus } from "../../../shared/enums";
import { RunnerDB } from "../../../shared/models";
import {
  deleteTimeRecord,
  getTimeRecordbyBib,
  getTimeRecordbyIndex,
  insertOrUpdateTimeRecord,
  isBibDuplicate,
  markTimeRecordAsSent,
  setTimingRecordNote
} from "../timingRecords-db";

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

const emitRunnersTableChanged = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/runner-data-emitter", () => ({ emitRunnersTableChanged }));

const pushTimeRecordUpdate = vi.hoisted(() => vi.fn(async () => ({ pushed: true })));
vi.mock("../../services/opensplittime", () => ({ pushTimeRecordUpdate }));

const sendToastToRenderer = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/toast-ipc", () => ({ sendToastToRenderer }));

const alertForWatchlistedAthlete = vi.hoisted(() => vi.fn());
vi.mock("../watchlist-db", () => ({
  alertForWatchlistedAthlete,
  GetWatchlistCount: vi.fn(() => 0),
  isWatchlisted: vi.fn(() => false)
}));

// status-db pulls in file-dialogs, which reads Electron app paths at import time.
vi.mock("../../lib/file-dialogs", () => ({
  AppPaths: { userRoot: "", eventConfig: "", appStore: "" },
  loadDropsFromCSV: vi.fn()
}));

const IN = new Date("2026-09-01T08:00:00Z");
const OUT = new Date("2026-09-01T09:00:00Z");

function runner(overrides: Partial<RunnerDB> = {}): RunnerDB {
  return {
    index: 0,
    bibId: 101,
    stationId: 3,
    timeIn: IN,
    timeOut: null,
    timeModified: new Date("2026-09-01T08:00:00Z"),
    note: "",
    sent: false,
    status: RecordStatus.OK,
    ...overrides
  } as RunnerDB;
}

function storedRows() {
  return db.prepare(`SELECT * FROM TimeRecords ORDER BY "index"`).all() as Array<
    RunnerDB & { index: number }
  >;
}

describe("timingRecords-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
    storeMock.data.clear();
    storeMock.data.set("station.id", 3);
    storeMock.data.set("station.identifier", "3-hardware");
    storeMock.data.set("station.entrymode", EntryMode.Normal);
    vi.clearAllMocks();
    pushTimeRecordUpdate.mockResolvedValue({ pushed: true });
  });

  afterEach(() => {
    db.close();
  });

  describe("insertOrUpdateTimeRecord - new records", () => {
    it("inserts a brand new record and reports Created", () => {
      const [status] = insertOrUpdateTimeRecord(runner());

      expect(status).toBe(DatabaseStatus.Created);
      expect(storedRows()).toHaveLength(1);
    });

    it("stamps the record with the current station", () => {
      insertOrUpdateTimeRecord(runner());

      expect(storedRows()[0].stationId).toBe(3);
    });

    it("mirrors the in time to the out time in fast entry mode", () => {
      storeMock.data.set("station.entrymode", EntryMode.Fast);

      insertOrUpdateTimeRecord(runner({ timeIn: IN, timeOut: null }));

      const row = storedRows()[0];
      expect(row.timeOut).toBe(IN.toISOString());
    });

    it("mirrors the out time to the in time in fast entry mode", () => {
      storeMock.data.set("station.entrymode", EntryMode.Fast);

      insertOrUpdateTimeRecord(runner({ timeIn: null, timeOut: OUT }));

      const row = storedRows()[0];
      expect(row.timeIn).toBe(OUT.toISOString());
    });

    it("logs the new record to the event log", () => {
      insertOrUpdateTimeRecord(runner());

      const logs = db.prepare(`SELECT * FROM EventLog`).all();
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe("insertOrUpdateTimeRecord - adding the opposite time", () => {
    it("merges an out time onto an existing in-only record", () => {
      insertOrUpdateTimeRecord(runner());

      const [status] = insertOrUpdateTimeRecord(runner({ timeIn: null, timeOut: OUT }));

      expect(status).toBe(DatabaseStatus.Updated);
      const rows = storedRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].timeIn).toBe(IN.toISOString());
      expect(rows[0].timeOut).toBe(OUT.toISOString());
    });

    it("preserves the existing note when merging", () => {
      insertOrUpdateTimeRecord(runner({ note: "steady" }));

      insertOrUpdateTimeRecord(runner({ timeIn: null, timeOut: OUT, note: "left" }));

      expect(storedRows()[0].note).toContain("left");
    });
  });

  describe("insertOrUpdateTimeRecord - duplicates", () => {
    it("records a second in time for the same bib as a duplicate", () => {
      insertOrUpdateTimeRecord(runner());

      const [status] = insertOrUpdateTimeRecord(
        runner({ timeIn: new Date("2026-09-01T08:30:00Z") })
      );

      expect(status).toBe(DatabaseStatus.Duplicate);
      const rows = storedRows();
      expect(rows).toHaveLength(2);
      expect(rows[1].status).toBe(RecordStatus.Duplicate);
    });

    it("offsets the duplicate's bib so it does not collide with the original", () => {
      insertOrUpdateTimeRecord(runner());

      insertOrUpdateTimeRecord(runner({ timeIn: new Date("2026-09-01T08:30:00Z") }));

      const rows = storedRows();
      expect(rows[1].bibId).toBeCloseTo(101.2, 5);
    });

    it("never pushes a duplicate to OpenSplitTime", () => {
      insertOrUpdateTimeRecord(runner());
      pushTimeRecordUpdate.mockClear();

      insertOrUpdateTimeRecord(runner({ timeIn: new Date("2026-09-01T08:30:00Z") }));

      expect(pushTimeRecordUpdate).not.toHaveBeenCalled();
    });
  });

  describe("insertOrUpdateTimeRecord - fast entry mode on a repeat scan", () => {
    // Fast mode is applied in the duplicate branch as well as the new-record branch; without a
    // duplicate recorded under fast mode, that second call site is never exercised.
    it("mirrors the time on a duplicate recorded in fast mode", () => {
      storeMock.data.set("station.entrymode", EntryMode.Fast);
      insertOrUpdateTimeRecord(runner());
      const secondScan = new Date("2026-09-01T08:30:00Z");

      insertOrUpdateTimeRecord(runner({ timeIn: secondScan, timeOut: null }));

      const rows = storedRows();
      expect(rows).toHaveLength(2);
      expect(rows[1].timeIn).toBe(secondScan.toISOString());
      expect(rows[1].timeOut).toBe(secondScan.toISOString());
    });
  });

  describe("insertOrUpdateTimeRecord - correcting a bib", () => {
    // Merging preserves only the times the incoming record is missing. A corrected time sent
    // alongside a corrected bib must win rather than being overwritten by the stored one.
    it("keeps the corrected in time when the bib is corrected at the same time", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      const correctedIn = new Date("2026-09-01T08:45:00Z");

      insertOrUpdateTimeRecord(runner({ index: existing.index, bibId: 202, timeIn: correctedIn }));

      const rows = storedRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].bibId).toBe(202);
      expect(rows[0].timeIn).toBe(correctedIn.toISOString());
    });

    it("keeps the corrected out time when the bib is corrected at the same time", () => {
      insertOrUpdateTimeRecord(runner({ timeOut: OUT }));
      const existing = storedRows()[0];
      const correctedOut = new Date("2026-09-01T09:45:00Z");

      insertOrUpdateTimeRecord(
        runner({ index: existing.index, bibId: 202, timeIn: IN, timeOut: correctedOut })
      );

      expect(storedRows()[0].timeOut).toBe(correctedOut.toISOString());
    });
  });

  describe("watchlist alerts", () => {
    it("alerts when a new record carries an arrival time", () => {
      insertOrUpdateTimeRecord(runner());

      expect(alertForWatchlistedAthlete).toHaveBeenCalledWith(101, "arrival");
    });

    // The alert fires when the stored record had no in time yet, i.e. an out-only record that
    // later gains an arrival.
    it("alerts when an out-only record later gains an arrival time", () => {
      insertOrUpdateTimeRecord(runner({ timeIn: null, timeOut: OUT }));
      alertForWatchlistedAthlete.mockClear();

      insertOrUpdateTimeRecord(runner({ timeIn: IN, timeOut: null }));

      expect(alertForWatchlistedAthlete).toHaveBeenCalledWith(101, "arrival");
    });

    // The alert fires only when the stored record had no in time yet, so editing a runner who
    // has already arrived must not alert the operator a second time.
    it("does not alert again when a runner who already arrived is edited", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      alertForWatchlistedAthlete.mockClear();

      insertOrUpdateTimeRecord(
        runner({ index: existing.index, timeIn: new Date("2026-09-01T08:15:00Z") })
      );

      expect(alertForWatchlistedAthlete).not.toHaveBeenCalled();
    });

    it("never alerts for a duplicate scan", () => {
      insertOrUpdateTimeRecord(runner());
      alertForWatchlistedAthlete.mockClear();

      insertOrUpdateTimeRecord(runner({ timeIn: new Date("2026-09-01T08:30:00Z") }));

      expect(alertForWatchlistedAthlete).not.toHaveBeenCalled();
    });
  });

  describe("insertOrUpdateTimeRecord - edits", () => {
    it("replaces the time on an existing record without merging", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      const corrected = new Date("2026-09-01T08:15:00Z");

      const [status] = insertOrUpdateTimeRecord(
        runner({ index: existing.index, timeIn: corrected })
      );

      expect(status).toBe(DatabaseStatus.Updated);
      expect(storedRows()[0].timeIn).toBe(corrected.toISOString());
    });

    it("moves a record onto a corrected bib number", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];

      insertOrUpdateTimeRecord(runner({ index: existing.index, bibId: 202 }));

      const rows = storedRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].bibId).toBe(202);
    });

    it("marks an edited record unsent so it is pushed again", async () => {
      insertOrUpdateTimeRecord(runner());
      markTimeRecordAsSent(101, true);
      const existing = storedRows()[0];

      insertOrUpdateTimeRecord(
        runner({ index: existing.index, timeIn: new Date("2026-09-01T08:15:00Z"), sent: true })
      );

      expect(storedRows()[0].sent).toBe(0);
    });

    it("pushes the edit to OpenSplitTime", async () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      pushTimeRecordUpdate.mockClear();

      insertOrUpdateTimeRecord(
        runner({ index: existing.index, timeIn: new Date("2026-09-01T08:15:00Z") })
      );

      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);
      expect(emitRunnersTableChanged).toHaveBeenCalled();
    });

    it("does not push when nothing about the times or bib changed", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      pushTimeRecordUpdate.mockClear();

      insertOrUpdateTimeRecord(runner({ index: existing.index, note: "same times" }));

      expect(pushTimeRecordUpdate).not.toHaveBeenCalled();
    });

    it("survives a failed OpenSplitTime push", async () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      pushTimeRecordUpdate.mockRejectedValue(new Error("network down"));

      const [status] = insertOrUpdateTimeRecord(
        runner({ index: existing.index, timeIn: new Date("2026-09-01T08:15:00Z") })
      );

      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);
      expect(status).toBe(DatabaseStatus.Updated);
    });
  });

  describe("getTimeRecordbyBib / getTimeRecordbyIndex", () => {
    it("finds a stored record by bib", () => {
      insertOrUpdateTimeRecord(runner());

      const [found, status] = getTimeRecordbyBib(runner());

      expect(status).toBe(DatabaseStatus.Success);
      expect(found?.bibId).toBe(101);
    });

    it("reports NotFound for an unknown bib", () => {
      const [found, status] = getTimeRecordbyBib(runner({ bibId: 999 }));

      expect(found).toBeNull();
      expect(status).toBe(DatabaseStatus.NotFound);
    });

    it("finds a stored record by index", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];

      const [found, status] = getTimeRecordbyIndex(runner({ index: existing.index }));

      expect(status).toBe(DatabaseStatus.Success);
      expect(found?.index).toBe(existing.index);
    });

    it("reports NotFound for an unknown index", () => {
      const [, status] = getTimeRecordbyIndex(runner({ index: 4242 }));

      expect(status).toBe(DatabaseStatus.NotFound);
    });

    it("reports Error when the lookup fails", () => {
      db.exec(`DROP TABLE TimeRecords`);

      expect(getTimeRecordbyBib(runner())[1]).toBe(DatabaseStatus.Error);
      expect(getTimeRecordbyIndex(runner())[1]).toBe(DatabaseStatus.Error);
    });
  });

  describe("deleteTimeRecord", () => {
    it("removes the record and reports Deleted", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];

      const [status] = deleteTimeRecord(runner({ index: existing.index }));

      expect(status).toBe(DatabaseStatus.Deleted);
      expect(storedRows()).toHaveLength(0);
    });

    it("logs the deletion to the event log", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];

      deleteTimeRecord(runner({ index: existing.index }));

      const logs = db.prepare(`SELECT * FROM EventLog WHERE comments LIKE '%Delete%'`).all();
      expect(logs).toHaveLength(1);
    });

    it("clears any lingering OpenSplitTime push status", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      db.prepare(
        `INSERT INTO OpenSplitTimePushStatus (bibId, status, error, updatedAt) VALUES (?, ?, ?, ?)`
      ).run(101, "error", "boom", new Date().toISOString());

      deleteTimeRecord(runner({ index: existing.index }));

      const rows = db.prepare(`SELECT * FROM OpenSplitTimePushStatus WHERE bibId = 101`).all();
      expect(rows).toHaveLength(0);
    });

    it("reports Error when the delete fails", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      db.exec(`DROP TABLE TimeRecords`);

      const [status] = deleteTimeRecord(runner({ index: existing.index }));

      expect(status).toBe(DatabaseStatus.Error);
    });
  });

  describe("markTimeRecordAsSent", () => {
    it("flags the record as sent", () => {
      insertOrUpdateTimeRecord(runner());

      markTimeRecordAsSent(101, true);

      expect(storedRows()[0].sent).toBe(1);
    });

    it("clears the sent flag", () => {
      insertOrUpdateTimeRecord(runner());
      markTimeRecordAsSent(101, true);

      markTimeRecordAsSent(101, false);

      expect(storedRows()[0].sent).toBe(0);
    });

    it("reports Error when the update fails", () => {
      db.exec(`DROP TABLE TimeRecords`);

      const [status] = markTimeRecordAsSent(101, true);

      expect(status).toBe(DatabaseStatus.Error);
    });
  });

  describe("setTimingRecordNote", () => {
    it("strips commas so the note survives CSV export", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];

      setTimingRecordNote({ ...runner({ index: existing.index }), note: "tired, sore" } as never);

      expect(storedRows()[0].note).toBe("tired sore");
    });

    it("treats a missing note as empty", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];

      setTimingRecordNote({ ...runner({ index: existing.index }), note: "" } as never);

      expect(storedRows()[0].note).toBe("");
    });

    it("reports Error when the update fails", () => {
      db.exec(`DROP TABLE TimeRecords`);

      const result = setTimingRecordNote(runner() as never);

      expect(result?.[0]).toBe(DatabaseStatus.Error);
    });
  });

  describe("isBibDuplicate", () => {
    it("is false when the bib appears once", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];

      const [duplicate, status] = isBibDuplicate(101, existing.index);

      expect(status).toBe(DatabaseStatus.Success);
      expect(duplicate).toBe(false);
    });

    it("is true when another record shares the bib", () => {
      insertOrUpdateTimeRecord(runner());
      db.prepare(
        `INSERT INTO TimeRecords (bibId, stationId, timeIn, timeOut, timeModified, note, sent, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(101, 3, IN.toISOString(), null, IN.toISOString(), "", 0, 0);
      const first = storedRows()[0];

      const [duplicate] = isBibDuplicate(101, first.index);

      expect(duplicate).toBe(true);
    });

    it("reports Error when the query fails", () => {
      db.exec(`DROP TABLE TimeRecords`);

      const [, status] = isBibDuplicate(101, 1);

      expect(status).toBe(DatabaseStatus.Error);
    });
  });
});
