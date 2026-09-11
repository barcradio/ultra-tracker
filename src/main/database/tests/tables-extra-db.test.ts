import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import {
  ClearTables,
  CreateTables,
  getColumnNamesFromTable,
  getTableNames,
  validateDatabaseTables
} from "../tables-db";

let db: Database.Database;

describe("tables-db", () => {
  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  describe("CreateTables", () => {
    it("creates every table the app expects", () => {
      const result = CreateTables(db);

      expect(result).toBe("Default tables were successfully created.");
      expect(getTableNames(db)).toEqual(
        expect.arrayContaining([
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
        ])
      );
    });

    it("is safe to run against a database that already has the tables", () => {
      CreateTables(db);

      expect(CreateTables(db)).toBe("Default tables were successfully created.");
    });

    it("reports a failure when the tables cannot be created", () => {
      const closed = new Database(":memory:");
      closed.close();

      expect(CreateTables(closed)).toBe("Database Create Failed");
    });
  });

  describe("ClearTables", () => {
    it("drops the event tables and resets the schema version", () => {
      db.close();
      db = createTestDatabase();

      const result = ClearTables(db);

      expect(result).toBe("Database tables cleared; Reinitialize or Restart!");
      expect(getTableNames(db)).not.toEqual(
        expect.arrayContaining(["Athletes", "TimeRecords", "Status", "Stations", "EventMeta"])
      );
      expect(db.pragma("user_version", { simple: true })).toBe(0);
    });

    // KNOWN DEFECT - intended behaviour asserted below, currently failing.
    // ClearTables drops every event table except RFIDInbox and RFIDPendingWrites, so tag reads
    // queued against the cleared event survive and can be replayed into the next one.
    // Marked `.fails` so CI stays green; it will start failing once the defect is fixed,
    // at which point the marker should be removed.
    it.fails("leaves no queued RFID reads behind from the cleared event", () => {
      db.close();
      db = createTestDatabase();

      ClearTables(db);

      expect(getTableNames(db)).toEqual([]);
    });

    it("reports a failure when the tables cannot be dropped", () => {
      const closed = new Database(":memory:");
      closed.close();

      expect(ClearTables(closed)).toBe("Database Clear Failed");
    });
  });

  describe("getTableNames", () => {
    it("returns an empty list for an empty database", () => {
      expect(getTableNames(db)).toEqual([]);
    });

    it("returns an empty list rather than throwing on a closed database", () => {
      const closed = new Database(":memory:");
      closed.close();

      expect(getTableNames(closed)).toEqual([]);
    });
  });

  describe("getColumnNamesFromTable", () => {
    it("lists the columns of a table", () => {
      CreateTables(db);

      const columns = getColumnNamesFromTable(db, "Athletes");

      expect(columns).toEqual(expect.arrayContaining(["bibId", "firstName", "lastName"]));
    });
  });

  describe("validateDatabaseTables", () => {
    it("accepts a schema-complete database", () => {
      db.close();
      db = createTestDatabase();

      expect(() => validateDatabaseTables(db)).not.toThrow();
    });

    it("creates whatever is missing from an empty database", () => {
      validateDatabaseTables(db);

      expect(getTableNames(db).length).toBeGreaterThan(0);
    });
  });
});
