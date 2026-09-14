import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { clearPushStatus, getPushStatus, setPushStatus } from "../opensplittimeStatus-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({
  getDatabaseConnection: () => db
}));

describe("opensplittimeStatus-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("returns null when no push status exists for a bib", () => {
    expect(getPushStatus(101)).toBeNull();
  });

  it("inserts a new push status record", () => {
    setPushStatus(101, "success");

    const status = getPushStatus(101);
    expect(status?.status).toBe("success");
    expect(status?.error).toBeNull();
  });

  it("updates an existing push status record instead of duplicating it", () => {
    setPushStatus(101, "success");
    setPushStatus(101, "error", "network timeout");

    const status = getPushStatus(101);
    expect(status?.status).toBe("error");
    expect(status?.error).toBe("network timeout");
    expect(db.prepare(`SELECT COUNT(*) AS count FROM OpenSplitTimePushStatus`).get()).toEqual({
      count: 1
    });
  });

  it("clears a push status record", () => {
    setPushStatus(101, "success");

    clearPushStatus(101);

    expect(getPushStatus(101)).toBeNull();
  });
});
