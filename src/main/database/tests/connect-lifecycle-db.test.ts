import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adoptLegacyDatabaseIfPresent,
  closeActiveConnection,
  createDatabaseFile,
  getDatabaseConnection,
  getDbPaths,
  isDatabaseConnected,
  switchToDatabase
} from "../connect-db";
import * as tableDefs0 from "../schema/table-definitions-v0";

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

let userDataDir = "";
vi.mock("electron", () => ({ app: { getPath: vi.fn(() => userDataDir) } }));

describe("connect-db lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-connect-"));
    storeMock.data.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    closeActiveConnection();
    vi.useRealTimers();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  function writeLegacyV0Database(slug: string) {
    const { dbFolder, dbPath } = getDbPaths(slug);
    fs.mkdirSync(dbFolder, { recursive: true });
    const legacy = new Database(dbPath);
    legacy.exec(`
      CREATE TABLE IF NOT EXISTS Athletes (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ${tableDefs0.Athletes});
      CREATE TABLE IF NOT EXISTS StationEvents (
        "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        bibId INTEGER DEFAULT (0), stationId INTEGER, timeIn DATETIME, timeOut DATETIME,
        timeModified DATETIME, note TEXT, sent BOOLEAN DEFAULT (FALSE), status INTEGER);
    `);
    legacy.pragma("user_version = 0");
    return legacy;
  }

  describe("createDatabaseFile", () => {
    it("creates a schema-complete database at the current version", () => {
      createDatabaseFile("bear-100");

      const db = getDatabaseConnection();
      expect(db.pragma("user_version", { simple: true })).toBe(3);
      const tables = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
        .all() as Array<{ name: string }>;
      expect(tables.map((table) => table.name)).toEqual(
        expect.arrayContaining(["Athletes", "Status", "TimeRecords", "EventMeta"])
      );
    });

    it("creates the event-databases folder when it is missing", () => {
      const { dbFolder } = getDbPaths("bear-100");
      expect(fs.existsSync(dbFolder)).toBe(false);

      createDatabaseFile("bear-100");

      expect(fs.existsSync(dbFolder)).toBe(true);
    });
  });

  describe("switchToDatabase", () => {
    it("records the event name from the database when one is stored", () => {
      createDatabaseFile("bear-100");
      getDatabaseConnection()
        .prepare(`INSERT INTO EventMeta (name) VALUES (?)`)
        .run("Bear 100 Mile");

      switchToDatabase("bear-100");

      expect(storeMock.data.get("event.name")).toBe("Bear 100 Mile");
      expect(storeMock.data.get("event.activeDatabaseSlug")).toBe("bear-100");
    });

    it("falls back to the slug when the database names no event", () => {
      createDatabaseFile("bear-100");

      switchToDatabase("bear-100");

      expect(storeMock.data.get("event.name")).toBe("bear-100");
    });

    it("closes the previous connection when switching", () => {
      createDatabaseFile("race-one");
      const first = getDatabaseConnection();
      createDatabaseFile("race-two");

      expect(getDatabaseConnection()).not.toBe(first);
      expect(first.open).toBe(false);
    });

    it("backs the database up on a timer", async () => {
      createDatabaseFile("bear-100");
      const { dbBackupPath } = getDbPaths("bear-100");

      await vi.advanceTimersByTimeAsync(300_000);
      await vi.waitFor(() => expect(fs.existsSync(dbBackupPath)).toBe(true), {
        timeout: 5000,
        interval: 10
      });
    });

    it("leaves no connection open when the database cannot be opened", () => {
      const { dbFolder, dbPath } = getDbPaths("broken");
      fs.mkdirSync(dbFolder, { recursive: true });
      fs.mkdirSync(dbPath); // a directory where the database file should be

      switchToDatabase("broken");

      expect(isDatabaseConnected()).toBe(false);
    });

    it("migrates a real legacy version-0 database file on disk", () => {
      const legacy = writeLegacyV0Database("legacy-race");
      legacy
        .prepare(`INSERT INTO Athletes (bibId, firstName, dns, dnf, note) VALUES (?, ?, ?, ?, ?)`)
        .run(101, "Ada", 1, 0, "never started");
      legacy.prepare(`INSERT INTO StationEvents (bibId, stationId) VALUES (?, ?)`).run(101, 3);
      legacy.close();

      switchToDatabase("legacy-race");

      const db = getDatabaseConnection();
      expect(db.pragma("user_version", { simple: true })).toBe(3);
      expect(db.prepare(`SELECT bibId FROM TimeRecords`).all()).toEqual([{ bibId: 101 }]);
      expect(db.prepare(`SELECT dropped, dropReason FROM Status WHERE bibId = 101`).get()).toEqual({
        dropped: 1,
        dropReason: "did-not-start"
      });
    });

    it("heals a current-shape database file that was stamped back to version 0", () => {
      createDatabaseFile("bear-100");
      const db = getDatabaseConnection();
      db.prepare(`INSERT INTO Status (bibId, dropped, progress) VALUES (?, ?, ?)`).run(101, 1, 4);
      db.prepare(`INSERT INTO TimeRecords (bibId, stationId) VALUES (?, ?)`).run(101, 3);

      closeActiveConnection();

      const resetVersion = new Database(getDbPaths("bear-100").dbPath);
      resetVersion.pragma("user_version = 0");
      resetVersion.close();

      switchToDatabase("bear-100");

      const healed = getDatabaseConnection();
      expect(healed.pragma("user_version", { simple: true })).toBe(3);
      expect(healed.prepare(`SELECT dropped, progress FROM Status WHERE bibId = 101`).get()).toEqual({
        dropped: 1,
        progress: 4
      });
      expect(healed.prepare(`SELECT bibId FROM TimeRecords`).all()).toEqual([{ bibId: 101 }]);
    });
  });

  describe("closeActiveConnection", () => {
    it("stops the backup timer so nothing writes after shutdown", async () => {
      createDatabaseFile("bear-100");
      const { dbBackupPath } = getDbPaths("bear-100");

      closeActiveConnection();
      await vi.advanceTimersByTimeAsync(600_000);

      expect(fs.existsSync(dbBackupPath)).toBe(false);
      expect(isDatabaseConnected()).toBe(false);
    });
  });

  describe("adoptLegacyDatabaseIfPresent", () => {
    function writeLegacyDatabase() {
      const { dbFolder } = getDbPaths("legacy");
      fs.mkdirSync(dbFolder, { recursive: true });
      fs.writeFileSync(path.join(dbFolder, "Bear100Devdb.db"), "legacy");
      return dbFolder;
    }

    it("renames a legacy database to a slug based on the event name", () => {
      writeLegacyDatabase();
      storeMock.data.set("event.name", "Bear 100");

      adoptLegacyDatabaseIfPresent();

      expect(fs.existsSync(getDbPaths("bear-100").dbPath)).toBe(true);
      expect(storeMock.data.get("event.activeDatabaseSlug")).toBe("bear-100");
      expect(storeMock.data.get("legacyDbMigrated")).toBe(true);
    });

    it("brings the legacy backup across too", () => {
      const dbFolder = writeLegacyDatabase();
      fs.writeFileSync(path.join(dbFolder, "Bear100db-backup.db"), "legacy backup");
      storeMock.data.set("event.name", "Bear 100");

      adoptLegacyDatabaseIfPresent();

      expect(fs.existsSync(getDbPaths("bear-100").dbBackupPath)).toBe(true);
    });

    it("falls back to a default slug when there is no event name", () => {
      writeLegacyDatabase();
      storeMock.data.set("event.name", "");

      adoptLegacyDatabaseIfPresent();

      expect(fs.existsSync(getDbPaths("default-event").dbPath)).toBe(true);
    });

    it("does nothing once the migration has already run", () => {
      writeLegacyDatabase();
      storeMock.data.set("legacyDbMigrated", true);
      storeMock.data.set("event.name", "Bear 100");

      adoptLegacyDatabaseIfPresent();

      expect(fs.existsSync(getDbPaths("bear-100").dbPath)).toBe(false);
    });

    it("does nothing when there is no legacy database", () => {
      storeMock.data.set("event.name", "Bear 100");

      adoptLegacyDatabaseIfPresent();

      expect(storeMock.data.get("legacyDbMigrated")).toBeUndefined();
    });

    it("leaves an existing set of event databases alone", () => {
      const dbFolder = writeLegacyDatabase();
      fs.writeFileSync(path.join(dbFolder, "already-here.db"), "existing");
      storeMock.data.set("event.name", "Bear 100");

      adoptLegacyDatabaseIfPresent();

      expect(fs.existsSync(getDbPaths("bear-100").dbPath)).toBe(false);
    });
  });
});
