import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeActiveConnection, createDatabaseFile, getDbPaths } from "../connect-db";
import {
  getEventDatabaseMetadata,
  listEventDatabaseBackupsWithMetadata,
  listEventDatabasesWithMetadata
} from "../event-databases-db";

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

describe("event-databases-db", () => {
  beforeEach(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-test-"));
    storeMock.data.clear();
  });

  afterEach(() => {
    closeActiveConnection();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  it("reports metadata for the active database through its live connection", async () => {
    createDatabaseFile("bear-100");

    const metadata = await getEventDatabaseMetadata("bear-100", "database");

    expect(metadata.slug).toBe("bear-100");
    expect(metadata.type).toBe("database");
    expect(metadata.athleteCount).toBe(0);
    expect(metadata.timingRecordCount).toBe(0);
    expect(metadata.error).toBeUndefined();
  });

  it("reports metadata for an inactive database by opening its own connection", async () => {
    createDatabaseFile("bear-100");
    createDatabaseFile("moab-50"); // switches the active connection away from bear-100

    const metadata = await getEventDatabaseMetadata("bear-100", "database");

    expect(metadata.slug).toBe("bear-100");
    expect(metadata.error).toBeUndefined();
    expect(storeMock.data.get("event.activeDatabaseSlug")).toBe("moab-50");
  });

  it("returns an error result for a database file that cannot be read", async () => {
    const metadata = await getEventDatabaseMetadata("does-not-exist", "database");

    expect(metadata.error).toBe("unreadable");
  });

  it("lists metadata for all known event databases", async () => {
    createDatabaseFile("bear-100");
    createDatabaseFile("moab-50");

    const results = await listEventDatabasesWithMetadata();

    expect(results.map((r) => r.slug).sort()).toEqual(["bear-100", "moab-50"]);
  });

  it("lists metadata for backup databases separately from live databases", async () => {
    createDatabaseFile("bear-100");
    const { dbPath, dbBackupPath } = getDbPaths("bear-100");
    fs.copyFileSync(dbPath, dbBackupPath);

    const results = await listEventDatabaseBackupsWithMetadata();

    expect(results.map((r) => r.slug)).toEqual(["bear-100"]);
    expect(results[0].type).toBe("backup");
  });
});
