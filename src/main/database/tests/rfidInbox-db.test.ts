import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { enqueue, getPending, markProcessed, replacePayload } from "../rfidInbox-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({
  getDatabaseConnection: () => db
}));

describe("rfidInbox-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("enqueues a payload and returns an incrementing index", () => {
    const first = enqueue("tag-1");
    const second = enqueue("tag-2");

    expect(second).toBeGreaterThan(first);
  });

  it("lists pending records in insertion order", () => {
    enqueue("tag-1");
    enqueue("tag-2");

    const pending = getPending();

    expect(pending.map((record) => record.payload)).toEqual(["tag-1", "tag-2"]);
  });

  it("excludes records once marked processed", () => {
    const index = enqueue("tag-1");
    enqueue("tag-2");

    markProcessed(index);

    expect(getPending().map((record) => record.payload)).toEqual(["tag-2"]);
  });

  it("replaces the payload for an existing record", () => {
    const index = enqueue("tag-1");

    replacePayload(index, "tag-1-corrected");

    expect(getPending()[0].payload).toBe("tag-1-corrected");
  });
});
