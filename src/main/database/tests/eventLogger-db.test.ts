import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { getEventLogs, logEvent } from "../eventLogger-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({
  getDatabaseConnection: () => db
}));

vi.mock("../../lib/store", () => ({
  appStore: {
    get: vi.fn(() => "1-default-station")
  }
}));

describe("eventLogger-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("falls back to the current station identifier when stationId is null", () => {
    logEvent(101, null, "2026-09-09T00:00:00.000Z", null, null, "arrived", false, false);

    const [record] = db.prepare(`SELECT * FROM EventLog`).all() as Array<{ stationId: string }>;
    expect(record.stationId).toBe("1-default-station");
  });

  it("stores an explicit stationId instead of the default", () => {
    logEvent(101, "3-aid-station", null, null, null, "note", false, false);

    const [record] = db.prepare(`SELECT * FROM EventLog`).all() as Array<{ stationId: string }>;
    expect(record.stationId).toBe("3-aid-station");
  });

  it("filters logs by the verbose flag and parses non-empty timestamps", () => {
    logEvent(101, null, "2026-09-09T00:00:00.000Z", null, null, "normal", false, false);
    logEvent(102, null, null, null, null, "verbose", false, true);

    const [normalLogs] = [getEventLogs(false)];
    expect(normalLogs[0]).toHaveLength(1);
    expect(normalLogs[0]?.[0].timeIn).toEqual(new Date("2026-09-09T00:00:00.000Z"));
    expect(normalLogs[0]?.[0].timeOut).toBeNull();

    const [verboseLogs] = [getEventLogs(true)];
    expect(verboseLogs[0]).toHaveLength(1);
    expect(verboseLogs[0]?.[0].comments).toBe("verbose");
  });
});
