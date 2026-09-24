import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import * as tableDefs0 from "../schema/table-definitions-v0";
import {
  ClearTables,
  CreateTables,
  getColumnNamesFromTable,
  getTableNames,
  validateDatabaseTables
} from "../tables-db";

const expectedTables = [
  "Athletes",
  "EventLog",
  "TimeRecords",
  "Stations",
  "Output",
  "Status",
  "OpenSplitTimePushStatus",
  "RFIDInbox",
  "RFIDPendingWrites",
  "RFIDProcessedEvents",
  "Watchlist",
  "EventMeta"
];

describe("tables-db", () => {
  describe("CreateTables", () => {
    it("creates all expected tables and reports success", () => {
      const db = new Database(":memory:");
      const result = CreateTables(db);

      expect(result).toBe("Default tables were successfully created.");
      const tableNames = getTableNames(db);
      for (const table of expectedTables) expect(tableNames).toContain(table);
    });

    it("is idempotent when called on an already-initialized database", () => {
      const db = new Database(":memory:");
      CreateTables(db);
      expect(CreateTables(db)).toBe("Default tables were successfully created.");
    });
  });

  describe("getTableNames", () => {
    it("excludes internal sqlite tables", () => {
      const db = new Database(":memory:");
      CreateTables(db);
      expect(getTableNames(db).some((name) => name.startsWith("sqlite_"))).toBe(false);
    });
  });

  describe("getColumnNamesFromTable", () => {
    it("returns the Athletes table's column names", () => {
      const db = new Database(":memory:");
      CreateTables(db);
      const columns = getColumnNamesFromTable(db, "Athletes");
      expect(columns).toEqual(expect.arrayContaining(["index", "bibId", "firstName", "lastName"]));
    });
  });

  describe("validateDatabaseTables", () => {
    it("recreates a table that is missing", () => {
      const db = new Database(":memory:");
      CreateTables(db);
      db.exec("DROP TABLE Watchlist");
      expect(getTableNames(db)).not.toContain("Watchlist");

      validateDatabaseTables(db);

      expect(getTableNames(db)).toContain("Watchlist");
    });

    it("migrates legacy timing data without creating the replacement table first", () => {
      const db = new Database(":memory:");
      db.exec(`
        CREATE TABLE Athletes (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs0.Athletes}
        );
        CREATE TABLE StationEvents (
          "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          bibId INTEGER DEFAULT (0), stationId INTEGER, timeIn DATETIME, timeOut DATETIME,
          timeModified DATETIME, note TEXT, sent BOOLEAN DEFAULT (FALSE), status INTEGER
        );
      `);
      db.pragma("user_version = 0");
      db.prepare("INSERT INTO StationEvents (bibId, stationId) VALUES (?, ?)").run(101, 3);

      validateDatabaseTables(db);

      expect(db.pragma("user_version", { simple: true })).toBe(4);
      expect(getTableNames(db)).not.toContain("StationEvents");
      expect(db.prepare("SELECT bibId, stationId FROM TimeRecords").all()).toEqual([
        expect.objectContaining({ bibId: 101, stationId: 3 })
      ]);
      expect(ClearTables(db)).toBe("Database tables cleared; Reinitialize or Restart!");
    });

    it("rejects an unsupported schema version", () => {
      const db = new Database(":memory:");
      db.pragma("user_version = 99");

      expect(() => validateDatabaseTables(db)).toThrow("Unsupported database schema version: 99");
    });
  });
});
