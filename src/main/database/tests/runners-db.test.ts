import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { DatabaseStatus } from "../../../shared/enums";
import {
  GetDidNotStartRunnersInStation,
  GetRunnersInStation,
  GetRunnersOutStation,
  GetRunnersWithDuplicateStatus,
  GetTotalRunners,
  GetUnknownRunners,
  exportDropsAsCSV,
  exportRunnersAsCSV,
  exportUnsentRunnersAsCSV,
  formatDate,
  importRunnersFromCSV,
  readRunnersTable
} from "../runners-db";

// Background pushes and file writes resolve on their own microtask/IO turn; allow a generous
// budget so a slow CI runner never turns a correct test into a flake.
const WAIT_FOR_ASYNC_WORK = { timeout: 5000, interval: 10 };

// The export functions kick off writeToCSV without awaiting it, so the file appears shortly
// after the call resolves rather than before it returns. See the `.fails` test below.
// The file also becomes visible before the stream has flushed every row, so wait on the row
// count rather than mere existence -- otherwise a partially written file reads as a failure.
async function readWhenWritten(target: string, expectedLines: number): Promise<string[]> {
  let lines: string[] = [];

  await vi.waitFor(() => {
    expect(fs.existsSync(target)).toBe(true);
    lines = fs.readFileSync(target, "utf-8").trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(expectedLines);
  }, WAIT_FOR_ASYNC_WORK);

  return lines;
}

let db: Database.Database;
let workDir: string;

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

vi.mock("../../ipc/runner-data-emitter", () => ({ emitRunnersTableChanged: vi.fn() }));
const getOpenSplitTimePushKindsForEntryMode = vi.hoisted(() => vi.fn(() => ["in"]));
vi.mock("../../services/opensplittime", () => ({
  getOpenSplitTimePushKindsForEntryMode,
  pushTimeRecordUpdate: vi.fn(async () => ({ pushed: false })),
  pushTimeRecord: vi.fn(async () => ({ pushed: false })),
  syncSplitEntryKinds: vi.fn()
}));

const dialogMocks = vi.hoisted(() => ({
  loadRunnersFromCSV: vi.fn(),
  saveRunnersToCSV: vi.fn(),
  saveDropsToCSV: vi.fn(),
  AppPaths: { userRoot: "" }
}));
vi.mock("../../lib/file-dialogs", () => dialogMocks);

function insertTiming(
  bibId: number,
  overrides: Partial<{
    timeIn: string | null;
    timeOut: string | null;
    sent: number;
    status: number;
    stationId: number;
    note: string;
  }> = {}
) {
  const row = {
    timeIn: new Date("2026-09-01T08:00:00Z").toISOString(),
    timeOut: null,
    sent: 0,
    status: 0,
    stationId: 3,
    note: "",
    ...overrides
  };
  db.prepare(
    `INSERT INTO TimeRecords (bibId, stationId, timeIn, timeOut, timeModified, note, sent, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    bibId,
    row.stationId,
    row.timeIn,
    row.timeOut,
    new Date().toISOString(),
    row.note,
    row.sent,
    row.status
  );
}

function insertStatusRow(
  bibId: number,
  dropped = 0,
  dropReason: string | null = null,
  dropStation: string | null = null
) {
  db.prepare(
    `INSERT INTO Status (bibId, dropped, dropReason, dropStation, dropDateTime, note, progress)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(bibId, dropped, dropReason, dropStation, dropped ? new Date().toISOString() : null, "", 0);
}

describe("runners-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-runners-"));
    storeMock.data.clear();
    storeMock.data.set("station.id", 3);
    storeMock.data.set("station.identifier", "3-hardware");
    storeMock.data.set("event.name", "Bear 100");
    storeMock.data.set("incrementalFileIndex", 1);
    dialogMocks.AppPaths.userRoot = workDir;
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  describe("formatDate", () => {
    it("returns an empty string for a null date", () => {
      expect(formatDate(null)).toBe("");
    });

    it("formats a date as time and day", () => {
      expect(formatDate(new Date("2026-09-01T13:45:07"))).toBe("13:45:07 01 Sep 2026");
    });
  });

  describe("counts", () => {
    it("counts every timing record", () => {
      insertTiming(101);
      insertTiming(102);

      expect(GetTotalRunners()).toBe(2);
    });

    it("excludes did-not-start placeholder records from the runner count", () => {
      // Start line DNS drops get a placeholder TimeRecords row for grid visibility; it must not
      // be double-counted against GetTotalDidNotStart() in the pendingArrivals stat formula.
      insertTiming(101);
      insertTiming(102);
      insertStatusRow(102, 1, "did-not-start", "0-start-line");

      expect(GetTotalRunners()).toBe(1);
    });

    it("counts runners still in the station", () => {
      insertTiming(101);
      insertTiming(102, { timeOut: new Date().toISOString() });

      expect(GetRunnersInStation()).toBe(1);
    });

    it("counts runners who have left the station", () => {
      insertTiming(101);
      insertTiming(102, { timeOut: new Date().toISOString() });

      expect(GetRunnersOutStation()).toBe(1);
    });

    it("excludes did-not-start placeholder records from the through-station count", () => {
      insertTiming(101);
      insertTiming(102, { timeOut: new Date().toISOString() });
      insertStatusRow(102, 1, "did-not-start", "0-start-line");

      expect(GetRunnersOutStation()).toBe(0);
    });

    it("counts records flagged as duplicates", () => {
      insertTiming(101, { status: 1 });
      insertTiming(102);

      expect(GetRunnersWithDuplicateStatus()).toBe(1);
    });

    it("counts runners with no matching athlete record", () => {
      insertTiming(101);
      db.prepare(
        `INSERT INTO Athletes (bibId, firstName, lastName, gender, age, city, state, emergencyPhone, emergencyName)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(102, "Ada", "Lovelace", "F", 36, "London", "UK", 5551234, "Charles");
      insertTiming(102);

      expect(GetUnknownRunners()).toBe(1);
    });

    it("counts did-not-start runners at this station", () => {
      insertTiming(101);
      insertStatusRow(101, 1, "did-not-start", "1-start");
      insertTiming(102);
      insertStatusRow(102);

      expect(GetDidNotStartRunnersInStation()).toBe(1);
    });

    it("returns the invalid sentinel when a count query fails", () => {
      db.exec(`DROP TABLE TimeRecords`);

      expect(GetTotalRunners()).toBe(-999);
      expect(GetRunnersInStation()).toBe(-999);
      expect(GetRunnersOutStation()).toBe(-999);
      expect(GetRunnersWithDuplicateStatus()).toBe(-999);
      expect(GetUnknownRunners()).toBe(-999);
      expect(GetDidNotStartRunnersInStation()).toBe(-999);
    });
  });

  describe("readRunnersTable", () => {
    it("returns timing records with dates revived", () => {
      insertTiming(101);

      const [rows, status] = readRunnersTable(false);

      expect(status).toBe(DatabaseStatus.Success);
      expect(rows).toHaveLength(1);
      expect(rows?.[0].timeIn).toBeInstanceOf(Date);
      expect(rows?.[0].timeOut).toBeNull();
    });

    it("joins drop information when asked to include drops", () => {
      insertTiming(101);
      insertStatusRow(101, 1, "withdrew", "3-hardware");

      const [rows] = readRunnersTable(true);

      expect(rows?.[0]).toMatchObject({ bibId: 101, dropped: 1, dropReason: "withdrew" });
    });

    it("reports Error when the query fails", () => {
      db.exec(`DROP TABLE TimeRecords`);

      const [rows, status] = readRunnersTable(false);

      expect(rows).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
    });
  });

  describe("exportRunnersAsCSV", () => {
    it("writes a title row, a header row and one row per record", async () => {
      insertTiming(101);
      insertStatusRow(101);
      const target = path.join(workDir, "runners.csv");
      dialogMocks.saveRunnersToCSV.mockResolvedValue(target);

      const message = await exportRunnersAsCSV();

      expect(message).toContain("File Export Successful");
      const lines = await readWhenWritten(target, 3);
      expect(lines[0]).toBe("Bear 100,3-hardware,full-export");
      expect(lines[1]).toBe("index,sent,bibId,timeIn,timeOut,dropReason,dropStation,note");
      expect(lines).toHaveLength(3);
    });

    it("returns the error message when the query fails", async () => {
      db.exec(`DROP TABLE TimeRecords`);

      const message = await exportRunnersAsCSV();

      expect(message).toMatch(/no such table/);
    });

    it("has finished writing the file by the time it reports success", async () => {
      insertTiming(101);
      insertStatusRow(101);
      const target = path.join(workDir, "runners.csv");
      dialogMocks.saveRunnersToCSV.mockResolvedValue(target);

      await exportRunnersAsCSV();

      expect(fs.existsSync(target)).toBe(true);
    });
  });

  describe("exportDropsAsCSV", () => {
    it("exports only drops from this station and earlier", async () => {
      insertStatusRow(101, 1, "withdrew", "1-start");
      insertStatusRow(102, 1, "withdrew", "9-later");
      const target = path.join(workDir, "drops.csv");
      dialogMocks.saveDropsToCSV.mockResolvedValue(target);

      await exportDropsAsCSV();

      const lines = await readWhenWritten(target, 3);
      expect(lines).toHaveLength(3);
      expect(lines[2]).toContain("101");
    });

    // The filter is `dropStation <= stationId`: a drop recorded at THIS station must export.
    // Without this case, narrowing the comparison to `<` goes unnoticed.
    it("includes a drop recorded at the current station", async () => {
      insertStatusRow(101, 1, "withdrew", "3-hardware");
      const target = path.join(workDir, "drops.csv");
      dialogMocks.saveDropsToCSV.mockResolvedValue(target);

      await exportDropsAsCSV();

      const lines = await readWhenWritten(target, 3);
      expect(lines[2]).toContain("101");
    });

    it("quotes an exported note that contains a comma", async () => {
      insertStatusRow(101, 1, "withdrew", "1-start");
      db.prepare(`UPDATE Status SET note = 'tired, sore' WHERE bibId = 101`).run();
      const target = path.join(workDir, "drops.csv");
      dialogMocks.saveDropsToCSV.mockResolvedValue(target);

      await exportDropsAsCSV();

      const lines = await readWhenWritten(target, 3);
      expect(lines[2]).toContain('"tired, sore"');
    });

    it("escapes a quote inside an exported note", async () => {
      insertStatusRow(101, 1, "withdrew", "1-start");
      db.prepare(`UPDATE Status SET note = 'said "ok"' WHERE bibId = 101`).run();
      const target = path.join(workDir, "drops.csv");
      dialogMocks.saveDropsToCSV.mockResolvedValue(target);

      await exportDropsAsCSV();

      const lines = await readWhenWritten(target, 3);
      expect(lines[2]).toContain('"said ""ok"""');
    });

    it("returns the error message when the query fails", async () => {
      db.exec(`DROP TABLE Status`);

      const message = await exportDropsAsCSV();

      expect(message).toMatch(/no such table/);
    });
  });

  describe("exportUnsentRunnersAsCSV", () => {
    it("exports unsent records and advances the incremental file index", async () => {
      insertTiming(101);
      insertStatusRow(101);

      const message = await exportUnsentRunnersAsCSV();

      expect(message).toContain("Incremental file export successful");
      expect(storeMock.data.get("incrementalFileIndex")).toBe(2);
      await readWhenWritten(path.join(workDir, "Aid03times_01i.csv"), 3);
    });

    it("marks the exported records as sent", async () => {
      insertTiming(101);
      insertStatusRow(101);

      await exportUnsentRunnersAsCSV();

      const row = db.prepare(`SELECT sent FROM TimeRecords WHERE bibId = 101`).get() as {
        sent: number;
      };
      expect(row.sent).toBe(1);
    });

    it("names the previous file when there is nothing new to send", async () => {
      insertTiming(101, { sent: 1 });
      insertStatusRow(101);

      const message = await exportUnsentRunnersAsCSV();

      expect(message).toBe("No unsent records, previous file: Aid03times_00i.csv");
    });

    it("reports that unsent runners could not be read when the query fails", async () => {
      db.exec(`DROP TABLE TimeRecords`);

      const message = await exportUnsentRunnersAsCSV();

      expect(message).toBe("Failed to get unsent runners");
    });
  });

  describe("importRunnersFromCSV", () => {
    it("imports timing records from an exported file", async () => {
      const file = path.join(workDir, "import.csv");
      fs.writeFileSync(
        file,
        [
          "Bear 100,3-hardware,full-export",
          "index,sent,bibId,timeIn,timeOut,dropReason,dropStation,note",
          "1,0,101,2026-09-01T08:00:00Z,2026-09-01T09:00:00Z,,,steady"
        ].join("\n")
      );
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([file]);

      await importRunnersFromCSV();

      const [rows] = readRunnersTable(false);
      expect(rows).toHaveLength(1);
      expect(rows?.[0].bibId).toBe(101);
    });

    it("records a drop when the imported row carries a drop reason", async () => {
      insertStatusRow(101);
      const file = path.join(workDir, "import.csv");
      fs.writeFileSync(
        file,
        [
          "Bear 100,3-hardware,full-export",
          "index,sent,bibId,timeIn,timeOut,dropReason,dropStation,note",
          "1,0,101,2026-09-01T08:00:00Z,2026-09-01T09:00:00Z,withdrew,3-hardware,"
        ].join("\n")
      );
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([file]);

      await importRunnersFromCSV();

      const row = db.prepare(`SELECT dropped FROM Status WHERE bibId = 101`).get() as {
        dropped: number;
      };
      expect(row.dropped).toBe(1);
    });

    // An exported duplicate carries a fractional bib (e.g. 101.2). Importing the pair restores
    // the original as bib 101 and the repeat scan as a duplicate offset from it.
    it("restores an exported duplicate pair as a runner plus its duplicate", async () => {
      const file = path.join(workDir, "import.csv");
      fs.writeFileSync(
        file,
        [
          "Bear 100,3-hardware,full-export",
          "index,sent,bibId,timeIn,timeOut,dropReason,dropStation,note",
          "1,0,101,2026-09-01T08:00:00Z,2026-09-01T09:00:00Z,,,",
          "2,0,101.2,2026-09-01T08:30:00Z,,,,"
        ].join("\n")
      );
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([file]);

      await importRunnersFromCSV();

      const rows = db
        .prepare(`SELECT bibId, status FROM TimeRecords ORDER BY bibId`)
        .all() as Array<{ bibId: number; status: number }>;
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ bibId: 101, status: 0 });
      expect(rows[1].bibId).toBeCloseTo(101.2, 5);
      expect(rows[1].status).toBe(1);
    });

    it("reports a parse failure to the operator", async () => {
      const file = path.join(workDir, "bad.csv");
      fs.writeFileSync(file, ["title", "header", '1,0,101,"unterminated'].join("\n"));
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([file]);

      await expect(importRunnersFromCSV()).rejects.toThrow(/Quote Not Closed/);
      expect(sendToastToRenderer).toHaveBeenCalledWith(expect.objectContaining({ type: "danger" }));
    });
  });

  describe("importing a file whose bibs collide with row positions", () => {
    function writeExport(name: string, bibs: number[]): string {
      const file = path.join(workDir, name);
      fs.writeFileSync(
        file,
        [
          "Bear 100,13-finish-line,full-export",
          "index,sent,bibId,timeIn,timeOut,dropReason,dropStation,note",
          ...bibs.map((bib, i) => `${i + 1},1,${bib},0${8 + (i % 9)}:00:00 27 Sep 2025,,,,`)
        ].join("\n") + "\n"
      );

      return file;
    }

    // Carrying the bib as the record's index made the insert treat whatever row already sat at
    // that position as the same record, so a low bib overwrote an unrelated runner and the
    // import quietly produced fewer records than the file held.
    it("keeps every runner when a bib number matches an earlier row", async () => {
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([
        writeExport("times.csv", [500, 600, 700, 1, 2])
      ]);

      await importRunnersFromCSV();

      const bibs = (
        db.prepare(`SELECT bibId FROM TimeRecords ORDER BY "index"`).all() as Array<{
          bibId: number;
        }>
      ).map((row) => row.bibId);

      expect(bibs).toEqual([500, 600, 700, 1, 2]);
    });

    it("skips a blank line rather than importing it as a record", async () => {
      const file = path.join(workDir, "blank-line.csv");
      fs.writeFileSync(
        file,
        [
          "Bear 100,13-finish-line,full-export",
          "index,sent,bibId,timeIn,timeOut,dropReason,dropStation,note",
          "1,1,101,08:00:00 27 Sep 2025,,,,",
          "",
          "2,1,102,08:00:00 27 Sep 2025,,,,"
        ].join("\n") + "\n"
      );
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([file]);

      await importRunnersFromCSV();

      const bibs = (
        db.prepare(`SELECT bibId FROM TimeRecords ORDER BY "index"`).all() as Array<{
          bibId: number;
        }>
      ).map((row) => row.bibId);

      expect(bibs).toEqual([101, 102]);
    });

    it("skips a row with no bib", async () => {
      const file = path.join(workDir, "no-bib.csv");
      fs.writeFileSync(
        file,
        [
          "Bear 100,13-finish-line,full-export",
          "index,sent,bibId,timeIn,timeOut,dropReason,dropStation,note",
          "1,1,101,08:00:00 27 Sep 2025,,,,",
          "2,1,,08:05:00 27 Sep 2025,,,,",
          "3,1,102,08:10:00 27 Sep 2025,,,,"
        ].join("\n") + "\n"
      );
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([file]);

      await importRunnersFromCSV();

      const bibs = (
        db.prepare(`SELECT bibId FROM TimeRecords ORDER BY "index"`).all() as Array<{
          bibId: number;
        }>
      ).map((row) => row.bibId);

      expect(bibs).toEqual([101, 102]);
    });

    it("imports every row of a file whose bibs all sit below the row count", async () => {
      const bibs = Array.from({ length: 40 }, (_, i) => 40 - i);
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([writeExport("descending.csv", bibs)]);

      await importRunnersFromCSV();

      const imported = db.prepare(`SELECT COUNT(*) AS count FROM TimeRecords`).get() as {
        count: number;
      };

      expect(imported.count).toBe(40);
    });
  });

  describe("importing a file written before notes were quoted", () => {
    function writeLegacyFile(notes: string[]): string {
      const target = path.join(workDir, "legacy-export.csv");
      const rows = notes.map(
        (note, i) => `${i + 1},0,${101 + i},08:00:00 01 Sep 2026,09:00:00 01 Sep 2026,,,${note}`
      );
      fs.writeFileSync(
        target,
        [
          "Bear 100,3-hardware,full-export",
          "index,sent,bibId,timeIn,timeOut,dropReason,dropStation,note",
          ...rows
        ].join("\n") + "\n"
      );
      return target;
    }

    async function importLegacy(notes: string[]) {
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([writeLegacyFile(notes)]);

      await importRunnersFromCSV();

      const rows = db.prepare(`SELECT note FROM TimeRecords ORDER BY bibId`).all() as Array<{
        note: string;
      }>;

      return { kept: rows.length, notes: rows.map((row) => row.note) };
    }

    it("keeps every record when an old note contains a raw quote", async () => {
      const result = await importLegacy(["fine", "fine", 'said "ok"', "fine"]);

      expect(result.kept).toBe(4);
      expect(result.notes).toContain('said "ok"');
    });

    it("keeps every record and the whole note when an old note contains a raw comma", async () => {
      const result = await importLegacy(["fine", "fine", "tired, sore", "fine"]);

      expect(result.kept).toBe(4);
      expect(result.notes).toContain("tired; sore");
    });
  });

  describe("note round trip", () => {
    const NOTE_LINE = 4;

    async function roundTrip(notes: string[]) {
      notes.forEach((note, i) => insertTiming(101 + i, { note, timeOut: "2026-09-01T09:00:00Z" }));
      const target = path.join(workDir, "full-export.csv");
      dialogMocks.saveRunnersToCSV.mockResolvedValue(target);

      await exportRunnersAsCSV();
      const lines = await readWhenWritten(target, notes.length + 2);

      db.exec(`DELETE FROM TimeRecords`);
      dialogMocks.loadRunnersFromCSV.mockResolvedValue([target]);
      await importRunnersFromCSV();

      const imported = db.prepare(`SELECT note FROM TimeRecords ORDER BY bibId`).all() as Array<{
        note: string;
      }>;

      return {
        kept: imported.length,
        notes: imported.map((row) => row.note),
        noteLine: lines[NOTE_LINE]
      };
    }

    it("keeps every record when a note contains a comma", async () => {
      const result = await roundTrip(["fine", "fine", "tired, sore", "fine"]);

      expect(result.kept).toBe(4);
      expect(result.noteLine).toContain('"tired, sore"');
      expect(result.notes).toContain("tired; sore");
    });

    it("keeps every record when a note contains a quote", async () => {
      const result = await roundTrip(["fine", "fine", 'said "ok"', "fine"]);

      expect(result.kept).toBe(4);
      expect(result.noteLine).toContain('"said ""ok"""');
      expect(result.notes).toContain('said "ok"');
    });

    it("leaves a plain note unquoted", async () => {
      const result = await roundTrip(["fine", "fine", "all good", "fine"]);

      expect(result.kept).toBe(4);
      expect(result.noteLine).toMatch(/,all good$/);
    });
  });
});
