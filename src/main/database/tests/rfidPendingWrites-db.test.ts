import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { enqueue, getPending, markProcessed, recordAttemptFailure } from "../rfidPendingWrites-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({
  getDatabaseConnection: () => db
}));

describe("rfidPendingWrites-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("enqueues a pending write with zero attempts", () => {
    const index = enqueue(101, "2026-09-09T00:00:00.000Z");

    const [pending] = getPending();
    expect(pending.index).toBe(index);
    expect(pending.bibId).toBe(101);
    expect(pending.attempts).toBe(0);
    expect(pending.lastError).toBeNull();
  });

  it("excludes records once marked processed", () => {
    const index = enqueue(101, "2026-09-09T00:00:00.000Z");
    enqueue(102, "2026-09-09T00:01:00.000Z");

    markProcessed(index);

    expect(getPending().map((record) => record.bibId)).toEqual([102]);
  });

  it("increments attempts and stores the last error on failure", () => {
    const index = enqueue(101, "2026-09-09T00:00:00.000Z");

    recordAttemptFailure(index, "timeout");
    recordAttemptFailure(index, "timeout again");

    const [pending] = getPending();
    expect(pending.attempts).toBe(2);
    expect(pending.lastError).toBe("timeout again");
  });
});
