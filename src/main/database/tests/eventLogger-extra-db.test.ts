import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { DatabaseStatus } from "../../../shared/enums";
import { getEventLogs, logEvent } from "../eventLogger-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({ getDatabaseConnection: () => db }));

const storeMock = vi.hoisted(() => ({
  get: vi.fn(() => "3-hardware"),
  set: vi.fn()
}));
vi.mock("../../lib/store", () => ({ appStore: storeMock }));

describe("eventLogger-db failure handling", () => {
  beforeEach(() => {
    db = createTestDatabase();
    vi.clearAllMocks();
    storeMock.get.mockReturnValue("3-hardware");
  });

  afterEach(() => {
    db.close();
  });

  it("falls back to the current station when none is supplied", () => {
    logEvent(101, null, null, null, null, "a note", false, false);

    const row = db.prepare(`SELECT stationId FROM EventLog`).get() as { stationId: string };
    expect(row.stationId).toBe("3-hardware");
  });

  it("keeps the station it was given", () => {
    logEvent(101, "7-later", null, null, null, "a note", false, false);

    const row = db.prepare(`SELECT stationId FROM EventLog`).get() as { stationId: string };
    expect(row.stationId).toBe("7-later");
  });

  it("reports Error when the log table is missing", () => {
    db.exec(`DROP TABLE EventLog`);

    const [status, message] = logEvent(101, null, null, null, null, "a note", false, false);

    expect(status).toBe(DatabaseStatus.Error);
    expect(message).toBe("Unable to add logEvent record.");
  });

  it("returns only the non-verbose entries by default", () => {
    logEvent(101, null, null, null, null, "operator visible", false, false);
    logEvent(102, null, null, null, null, "debug detail", false, true);

    const [rows] = getEventLogs();

    expect(rows).toHaveLength(1);
    expect(rows?.[0].comments).toBe("operator visible");
  });

  it("returns the verbose entries when asked", () => {
    logEvent(102, null, null, null, null, "debug detail", false, true);

    const [rows] = getEventLogs(true);

    expect(rows).toHaveLength(1);
  });

  it("revives stored timestamps as dates and blanks as null", () => {
    logEvent(101, null, "2026-09-01T08:00:00Z", null, null, "with a time", false, false);

    const [rows] = getEventLogs();

    expect(rows?.[0].timeIn).toBeInstanceOf(Date);
    expect(rows?.[0].timeOut).toBeNull();
  });

  it("reports Error when the log table is missing on read", () => {
    db.exec(`DROP TABLE EventLog`);

    const [rows, status] = getEventLogs();

    expect(rows).toBeNull();
    expect(status).toBe(DatabaseStatus.Error);
  });
});
