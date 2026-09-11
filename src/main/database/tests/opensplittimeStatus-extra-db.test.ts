import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { clearPushStatus, getPushStatus, setPushStatus } from "../opensplittimeStatus-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({ getDatabaseConnection: () => db }));

describe("opensplittimeStatus-db failure handling", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("returns nothing for a bib that has never been pushed", () => {
    expect(getPushStatus(101)).toBeNull();
  });

  it("replaces a previous outcome rather than adding a second row", () => {
    setPushStatus(101, "error", "rejected");
    setPushStatus(101, "success");

    const rows = db.prepare(`SELECT * FROM OpenSplitTimePushStatus WHERE bibId = 101`).all();
    expect(rows).toHaveLength(1);
    expect(getPushStatus(101)).toMatchObject({ status: "success", error: null });
  });

  it("survives a read against a missing table", () => {
    db.exec(`DROP TABLE OpenSplitTimePushStatus`);

    expect(getPushStatus(101)).toBeNull();
  });

  it("survives a write against a missing table", () => {
    db.exec(`DROP TABLE OpenSplitTimePushStatus`);

    expect(() => setPushStatus(101, "success")).not.toThrow();
  });

  it("survives a clear against a missing table", () => {
    db.exec(`DROP TABLE OpenSplitTimePushStatus`);

    expect(() => clearPushStatus(101)).not.toThrow();
  });
});
