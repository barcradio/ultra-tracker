import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeActiveConnection,
  createDatabaseFile,
  deleteDatabaseFiles,
  getDatabaseConnection,
  getDbPaths,
  isDatabaseConnected,
  listEventDatabaseBackupSlugs,
  listEventDatabaseSlugs,
  resolveUniqueSlug,
  slugify
} from "../connect-db";

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

// Populated per-test by beforeEach; referenced lazily by the electron mock below.
let userDataDir = "";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => userDataDir)
  }
}));

vi.mock("../../lib/store", () => ({
  appStore: storeMock
}));

describe("connect-db", () => {
  beforeEach(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-test-"));
    storeMock.data.clear();
  });

  afterEach(() => {
    closeActiveConnection();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  describe("slugify", () => {
    it("lowercases and hyphenates non-alphanumeric runs", () => {
      expect(slugify("The Bear 100!")).toBe("the-bear-100");
    });

    it("strips leading and trailing hyphens", () => {
      expect(slugify("--Race Name--")).toBe("race-name");
    });
  });

  describe("getDbPaths", () => {
    it("builds db and backup paths under the event-databases folder", () => {
      const paths = getDbPaths("my-event");
      expect(paths.dbFolder).toBe(path.join(userDataDir, "event-databases"));
      expect(paths.dbPath).toBe(path.join(userDataDir, "event-databases", "my-event.db"));
      expect(paths.dbBackupPath).toBe(
        path.join(userDataDir, "event-databases", "my-event-backup.db")
      );
    });
  });

  describe("listEventDatabaseSlugs / listEventDatabaseBackupSlugs", () => {
    it("returns an empty array when the folder does not exist", () => {
      expect(listEventDatabaseSlugs()).toEqual([]);
      expect(listEventDatabaseBackupSlugs()).toEqual([]);
    });

    it("lists database slugs excluding backups, and backup slugs separately", () => {
      const { dbFolder } = getDbPaths("ignored");
      fs.mkdirSync(dbFolder, { recursive: true });
      fs.writeFileSync(path.join(dbFolder, "race-one.db"), "");
      fs.writeFileSync(path.join(dbFolder, "race-two.db"), "");
      fs.writeFileSync(path.join(dbFolder, "race-one-backup.db"), "");

      expect(listEventDatabaseSlugs().sort()).toEqual(["race-one", "race-two"]);
      expect(listEventDatabaseBackupSlugs()).toEqual(["race-one"]);
    });
  });

  describe("resolveUniqueSlug", () => {
    it("returns the base slug when it is unused", () => {
      expect(resolveUniqueSlug("new-race")).toBe("new-race");
    });

    it("appends an incrementing suffix when the slug is taken", () => {
      const { dbFolder } = getDbPaths("ignored");
      fs.mkdirSync(dbFolder, { recursive: true });
      fs.writeFileSync(path.join(dbFolder, "race.db"), "");
      fs.writeFileSync(path.join(dbFolder, "race-2.db"), "");

      expect(resolveUniqueSlug("race")).toBe("race-3");
    });
  });

  describe("createDatabaseFile / switchToDatabase", () => {
    it("creates a database file, connects to it, and records the active slug", () => {
      createDatabaseFile("bear-100");

      const { dbPath } = getDbPaths("bear-100");
      expect(fs.existsSync(dbPath)).toBe(true);
      expect(isDatabaseConnected()).toBe(true);
      expect(storeMock.data.get("event.activeDatabaseSlug")).toBe("bear-100");
      expect(getDatabaseConnection()).toBeDefined();
    });

    it("throws when reading from an uninitialized connection", () => {
      expect(() => getDatabaseConnection()).toThrow("Database connection not initialized");
    });
  });

  describe("deleteDatabaseFiles", () => {
    it("refuses to delete the active database", () => {
      createDatabaseFile("bear-100");
      expect(() => deleteDatabaseFiles("bear-100", "database")).toThrow(
        "Cannot delete the active database"
      );
    });

    it("removes the database file and its WAL/SHM siblings", () => {
      const { dbFolder, dbPath } = getDbPaths("orphan");
      fs.mkdirSync(dbFolder, { recursive: true });
      fs.writeFileSync(dbPath, "");
      fs.writeFileSync(`${dbPath}-wal`, "");
      fs.writeFileSync(`${dbPath}-shm`, "");

      deleteDatabaseFiles("orphan", "database");

      expect(fs.existsSync(dbPath)).toBe(false);
      expect(fs.existsSync(`${dbPath}-wal`)).toBe(false);
      expect(fs.existsSync(`${dbPath}-shm`)).toBe(false);
    });
  });
});
