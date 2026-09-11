import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as tableDefs0 from "../schema/table-definitions-v0";
import { applyMigrations, getColumnNamesFromTable, getTableNames } from "../tables-db";

let db: Database.Database;

// A database as it looked before the Status table existed: drop flags lived on Athletes and
// timing rows lived in StationEvents.
function createLegacyV0Database() {
  const database = new Database(":memory:");
  database.exec(`
    CREATE TABLE IF NOT EXISTS Athletes (
      "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs0.Athletes});
    CREATE TABLE IF NOT EXISTS StationEvents (
      "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      bibId INTEGER DEFAULT (0), stationId INTEGER, timeIn DATETIME, timeOut DATETIME,
      timeModified DATETIME, note TEXT, sent BOOLEAN DEFAULT (FALSE), status INTEGER);
  `);
  database.pragma("user_version = 0");
  return database;
}

function schemaVersion() {
  return db.pragma("user_version", { simple: true }) as number;
}

describe("migrations-db", () => {
  afterEach(() => {
    db.close();
  });

  describe("migrating a legacy database", () => {
    beforeEach(() => {
      db = createLegacyV0Database();
    });

    it("reaches the current schema version", () => {
      applyMigrations(db);

      expect(schemaVersion()).toBe(3);
    });

    it("creates the tables the current app expects", () => {
      applyMigrations(db);

      const tables = getTableNames(db);
      expect(tables).toEqual(
        expect.arrayContaining([
          "Status",
          "TimeRecords",
          "RFIDInbox",
          "RFIDPendingWrites",
          "OpenSplitTimePushStatus",
          "Watchlist",
          "EventMeta"
        ])
      );
    });

    it("renames StationEvents to TimeRecords rather than dropping the timing data", () => {
      db.prepare(`INSERT INTO StationEvents (bibId, stationId) VALUES (?, ?)`).run(101, 3);

      applyMigrations(db);

      const rows = db.prepare(`SELECT bibId FROM TimeRecords`).all() as Array<{ bibId: number }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].bibId).toBe(101);
      expect(getTableNames(db)).not.toContain("StationEvents");
    });

    it("moves the drop flags off Athletes and onto Status", () => {
      applyMigrations(db);

      const athleteColumns = getColumnNamesFromTable(db, "Athletes");
      expect(athleteColumns).not.toContain("dns");
      expect(athleteColumns).not.toContain("dnf");
      expect(getColumnNamesFromTable(db, "Status")).toEqual(
        expect.arrayContaining(["dropped", "dropReason", "dropStation", "dropDateTime"])
      );
    });

    it("converts a did-not-start athlete into a did-not-start drop", () => {
      db.prepare(
        `INSERT INTO Athletes (bibId, firstName, dns, dnf, note) VALUES (?, ?, ?, ?, ?)`
      ).run(101, "Ada", 1, 0, "never started");

      applyMigrations(db);

      const row = db.prepare(`SELECT * FROM Status WHERE bibId = 101`).get() as {
        dropped: number;
        dropReason: string;
        note: string;
      };
      expect(row.dropped).toBe(1);
      expect(row.dropReason).toBe("did-not-start");
      expect(row.note).toBe("never started");
    });

    it("converts a did-not-finish athlete into a drop carrying its reason and station", () => {
      db.prepare(
        `INSERT INTO Athletes (bibId, firstName, dns, dnf, dnfType, dnfStation) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(102, "Alan", 0, 1, "medical", "3-hardware");

      applyMigrations(db);

      const row = db.prepare(`SELECT * FROM Status WHERE bibId = 102`).get() as {
        dropped: number;
        dropReason: string;
        dropStation: string;
      };
      expect(row.dropped).toBe(1);
      expect(row.dropReason).toBe("medical");
      expect(row.dropStation).toBe("3-hardware");
    });

    it("leaves a still-running athlete undropped", () => {
      db.prepare(`INSERT INTO Athletes (bibId, firstName, dns, dnf) VALUES (?, ?, ?, ?)`).run(
        103,
        "Grace",
        0,
        0
      );

      applyMigrations(db);

      const row = db.prepare(`SELECT * FROM Status WHERE bibId = 103`).get() as {
        dropped: number;
        dropReason: string | null;
      };
      expect(row.dropped).toBe(0);
      expect(row.dropReason).toBeNull();
    });
  });

  describe("migrating a database that is already current", () => {
    it("is a no-op on a database already at the current version", () => {
      db = createLegacyV0Database();
      applyMigrations(db);
      const tablesAfterFirstRun = getTableNames(db).sort();

      applyMigrations(db);

      expect(schemaVersion()).toBe(3);
      expect(getTableNames(db).sort()).toEqual(tablesAfterFirstRun);
    });

    it("preserves data across a repeated migration", () => {
      db = createLegacyV0Database();
      db.prepare(`INSERT INTO Athletes (bibId, firstName, dns, dnf) VALUES (?, ?, ?, ?)`).run(
        101,
        "Ada",
        1,
        0
      );
      applyMigrations(db);

      applyMigrations(db);

      const rows = db.prepare(`SELECT * FROM Status WHERE bibId = 101`).all();
      expect(rows).toHaveLength(1);
    });
  });

  describe("migrating a database whose tables are ahead of its recorded version", () => {
    // Some real-world databases were scaffolded with current-shape tables but never had a
    // matching user_version stamped, so the migration steps have to tolerate that.
    it("stamps the current version without corrupting the existing tables", () => {
      db = createLegacyV0Database();
      applyMigrations(db);
      db.pragma("user_version = 0");
      db.prepare(`INSERT INTO Status (bibId, dropped) VALUES (?, ?)`).run(101, 1);

      applyMigrations(db);

      expect(schemaVersion()).toBe(3);
      const rows = db.prepare(`SELECT * FROM Status WHERE bibId = 101`).all();
      expect(rows).toHaveLength(1);
    });
  });

  describe("when a migration fails", () => {
    it("reverts the recorded version rather than claiming to be current", () => {
      // A Status table carrying `dns` but missing the rest of the legacy drop columns makes the
      // v3 conversion's INSERT...SELECT fail part-way through.
      db = createLegacyV0Database();
      db.exec(`CREATE TABLE Status (bibId INTEGER, dns INTEGER)`);

      applyMigrations(db);

      expect(schemaVersion()).toBeLessThan(3);
    });
  });
});
