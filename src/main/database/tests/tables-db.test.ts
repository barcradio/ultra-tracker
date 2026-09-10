import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
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
  });
});
