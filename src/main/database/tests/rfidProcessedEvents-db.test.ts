import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { hasProcessed, markProcessed } from "../rfidProcessedEvents-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({
  getDatabaseConnection: () => db
}));

describe("rfidProcessedEvents-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("reports an event as unprocessed before it is recorded", () => {
    expect(hasProcessed("101:2026-09-09T00:00:00.000Z")).toBe(false);
  });

  it("reports an event as processed once recorded", () => {
    markProcessed("101:2026-09-09T00:00:00.000Z");

    expect(hasProcessed("101:2026-09-09T00:00:00.000Z")).toBe(true);
  });

  it("does not track unrelated events as processed", () => {
    markProcessed("101:2026-09-09T00:00:00.000Z");

    expect(hasProcessed("102:2026-09-09T00:00:00.000Z")).toBe(false);
  });

  it("ignores marking the same event processed twice", () => {
    markProcessed("101:2026-09-09T00:00:00.000Z");

    expect(() => markProcessed("101:2026-09-09T00:00:00.000Z")).not.toThrow();
    expect(hasProcessed("101:2026-09-09T00:00:00.000Z")).toBe(true);
  });
});
