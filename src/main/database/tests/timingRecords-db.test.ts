import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { DatabaseStatus, EntryMode, RecordStatus } from "../../../shared/enums";
import { RunnerDB } from "../../../shared/models";
import {
  countTimingRecordsAtOtherStations,
  deleteTimeRecord,
  getTimeRecordbyBib,
  getTimeRecordbyIndex,
  insertOrUpdateTimeRecord,
  isBibDuplicate,
  markTimeRecordAsSent,
  moveTimingRecordsToStation,
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

    it("pushes only the created in time", async () => {
      insertOrUpdateTimeRecord(runner());

      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);
      expect(pushTimeRecordUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ timeIn: IN, timeOut: null }),
        expect.anything(),
        { kinds: ["in"] }
      );
    });

    it("pushes only the created out time", async () => {
      insertOrUpdateTimeRecord(runner({ timeIn: null, timeOut: OUT }));

      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);
      expect(pushTimeRecordUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ timeIn: null, timeOut: OUT }),
        expect.anything(),
        { kinds: ["out"] }
      );
    });

    it("pushes both kinds when both times are created", async () => {
      insertOrUpdateTimeRecord(runner({ timeOut: OUT }));

      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);
      expect(pushTimeRecordUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ timeIn: IN, timeOut: OUT }),
        expect.anything(),
        { kinds: ["in", "out"] }
      );
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
    it("scrubs renderer string dates before updating", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];

      const stringDates = runner({
        index: existing.index,
        timeIn: "2026-09-01T08:15:00.000Z",
        timeOut: "2026-09-01T09:15:00.000Z",
        timeModified: "2026-09-01T09:15:00.000Z"
      } as never);

      expect(() => insertOrUpdateTimeRecord(stringDates)).not.toThrow();
      expect(storedRows()[0].timeIn).toBeNull();
      expect(storedRows()[0].timeOut).toBeNull();
      expect(storedRows()[0].timeModified).toBeNull();
    });

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

    it("updates the index-matched record as a duplicate when bib and index match different records", () => {
      insertOrUpdateTimeRecord(runner({ bibId: 101 }));
      insertOrUpdateTimeRecord(runner({ bibId: 202, timeIn: new Date("2026-09-01T08:30:00Z") }));
      const rows = storedRows();
      const bibMatched = rows.find((row) => row.bibId === 101)!;
      const indexMatched = rows.find((row) => row.bibId === 202)!;

      const [status] = insertOrUpdateTimeRecord(
        runner({
          index: indexMatched.index,
          bibId: bibMatched.bibId,
          timeIn: new Date("2026-09-01T08:45:00Z")
        })
      );

      expect(status).toBe(DatabaseStatus.Duplicate);
      expect(storedRows()).toHaveLength(2);
      expect(storedRows().map((row) => row.bibId)).toEqual(
        expect.arrayContaining([bibMatched.bibId, bibMatched.bibId + 0.2])
      );
    });

    it("does nothing when bib and index identify an unchanged record", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      pushTimeRecordUpdate.mockClear();

      const [status, message] = insertOrUpdateTimeRecord(existing);

      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toBe("");
      expect(pushTimeRecordUpdate).not.toHaveBeenCalled();
      expect(storedRows()).toEqual([existing]);
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

    it("pushes only the edited in time", async () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      pushTimeRecordUpdate.mockClear();

      insertOrUpdateTimeRecord(
        runner({ index: existing.index, timeIn: new Date("2026-09-01T08:15:00Z") })
      );

      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);
      expect(pushTimeRecordUpdate).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        kinds: ["in"]
      });
    });

    it("pushes only the edited out time", async () => {
      insertOrUpdateTimeRecord(runner({ timeOut: OUT }));
      const existing = storedRows()[0];
      pushTimeRecordUpdate.mockClear();

      insertOrUpdateTimeRecord(
        runner({
          index: existing.index,
          timeOut: new Date("2026-09-01T09:15:00Z")
        })
      );

      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);
      expect(pushTimeRecordUpdate).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        kinds: ["out"]
      });
    });

    it("pushes only the newly merged out time", async () => {
      insertOrUpdateTimeRecord(runner());
      pushTimeRecordUpdate.mockClear();

      insertOrUpdateTimeRecord(runner({ timeIn: null, timeOut: OUT }));

      await vi.waitFor(() => expect(pushTimeRecordUpdate).toHaveBeenCalled(), WAIT_FOR_ASYNC_WORK);
      expect(pushTimeRecordUpdate).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        kinds: ["out"]
      });
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

    it("logs the stored record values instead of renderer-provided values", () => {
      insertOrUpdateTimeRecord(runner({ timeIn: new Date(2026, 8, 1, 8, 0, 0) }));
      const existing = storedRows()[0];

      deleteTimeRecord(
        runner({
          index: existing.index,
          bibId: 999,
          timeIn: new Date("2026-09-01T10:00:00Z"),
          timeOut: new Date("2026-09-01T11:00:00Z")
        })
      );

      const [log] = db
        .prepare(`SELECT comments FROM EventLog WHERE comments LIKE '%Delete%'`)
        .all() as [{ comments: string }];
      expect(log.comments).toContain("bibId: (101)");
      expect(log.comments).toContain("In: 08:00:00");
      expect(log.comments).toContain("Out:");
      expect(log.comments).not.toContain("bibId: (999)");
      expect(log.comments).not.toContain("10:00:00");
      expect(log.comments).not.toContain("11:00:00");
    });

    it("still deletes the record when a stored timestamp is malformed", () => {
      insertOrUpdateTimeRecord(runner());
      const existing = storedRows()[0];
      db.prepare(`UPDATE TimeRecords SET timeIn = ? WHERE "index" = ?`).run(
        "not-a-date",
        existing.index
      );

      const [status] = deleteTimeRecord(runner({ index: existing.index }));

      expect(status).toBe(DatabaseStatus.Deleted);
      expect(storedRows()).toHaveLength(0);
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

    it("reports NotFound when the record no longer exists", () => {
      const [status, message] = deleteTimeRecord(runner({ index: 999, bibId: 101 }));

      expect(status).toBe(DatabaseStatus.NotFound);
      expect(message).toContain("index 999");
      const logs = db.prepare(`SELECT * FROM EventLog WHERE comments LIKE '%Delete%'`).all();
      expect(logs).toHaveLength(0);
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

  describe("reconciling records after a station change", () => {
    function record(bibId: number, stationId: number) {
      db.prepare(
        `INSERT INTO TimeRecords (bibId, stationId, timeIn, timeModified, note, sent, status)
         VALUES (?, ?, ?, ?, '', 0, 0)`
      ).run(bibId, stationId, "2026-09-25T14:00:00Z", "2026-09-25T14:00:00Z");
    }

    it("counts only the records logged at another station", () => {
      record(101, 3);
      record(102, 3);
      record(103, 7);

      expect(countTimingRecordsAtOtherStations(3)).toBe(1);
      expect(countTimingRecordsAtOtherStations(7)).toBe(2);
    });

    it("counts nothing when every record is already at the station", () => {
      record(101, 3);
      record(102, 3);

      expect(countTimingRecordsAtOtherStations(3)).toBe(0);
    });

    it("moves the records that belong to another station and reports how many", () => {
      record(101, 3);
      record(102, 7);
      record(103, 9);

      const [moved, status] = moveTimingRecordsToStation(3);

      expect(moved).toBe(2);
      expect(status).toBe(DatabaseStatus.Updated);
      expect(
        db.prepare(`SELECT COUNT(*) AS count FROM TimeRecords WHERE stationId = 3`).get()
      ).toEqual({ count: 3 });
    });

    it("leaves the database alone when there is nothing to move", () => {
      record(101, 3);

      const [moved] = moveTimingRecordsToStation(3);

      expect(moved).toBe(0);
    });

    it("reports a failure rather than throwing when the table is gone", () => {
      db.exec(`DROP TABLE TimeRecords`);

      const [moved, status] = moveTimingRecordsToStation(3);

      expect(moved).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(countTimingRecordsAtOtherStations(3)).toBe(0);
    });
  });
});
