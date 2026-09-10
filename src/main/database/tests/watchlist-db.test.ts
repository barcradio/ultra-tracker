import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import {
  GetWatchlistCount,
  alertForWatchlistedAthlete,
  isWatchlisted,
  removeFromWatchlist,
  toggleWatchlist
} from "../watchlist-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({
  getDatabaseConnection: () => db
}));

vi.mock("../../lib/store", () => ({
  appStore: {
    get: vi.fn(() => "1-default-station")
  }
}));

const sendToastToRenderer = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/toast-ipc", () => ({ sendToastToRenderer }));

describe("watchlist-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
    sendToastToRenderer.mockClear();
  });

  afterEach(() => {
    db.close();
  });

  it("reports a bib as not watchlisted by default", () => {
    expect(isWatchlisted(101)).toBe(false);
    expect(GetWatchlistCount()).toBe(0);
  });

  it("toggles a bib onto and off the watchlist", () => {
    const [addedState] = toggleWatchlist(101);
    expect(addedState).toBe(true);
    expect(isWatchlisted(101)).toBe(true);
    expect(GetWatchlistCount()).toBe(1);

    const [removedState] = toggleWatchlist(101);
    expect(removedState).toBe(false);
    expect(isWatchlisted(101)).toBe(false);
  });

  it("logs an event whenever the watchlist changes", () => {
    toggleWatchlist(101);

    const logs = db.prepare(`SELECT * FROM EventLog`).all() as Array<{ comments: string }>;
    expect(logs).toHaveLength(1);
    expect(logs[0].comments).toContain("Add");
  });

  it("removeFromWatchlist reports NotFound for a bib that isn't watchlisted", () => {
    const [status] = removeFromWatchlist(101);
    expect(status).toBe(4); // DatabaseStatus.NotFound
  });

  it("removeFromWatchlist removes a watchlisted bib", () => {
    toggleWatchlist(101);
    removeFromWatchlist(101);
    expect(isWatchlisted(101)).toBe(false);
  });

  it("alerts and logs when a watchlisted athlete arrives", () => {
    toggleWatchlist(101);
    sendToastToRenderer.mockClear();

    alertForWatchlistedAthlete(101, "arrival");

    expect(sendToastToRenderer).toHaveBeenCalledTimes(1);
    const logs = db.prepare(`SELECT * FROM EventLog WHERE comments LIKE '%Alert%'`).all();
    expect(logs).toHaveLength(1);
  });

  it("does nothing when the athlete is not watchlisted", () => {
    alertForWatchlistedAthlete(101, "drop");

    expect(sendToastToRenderer).not.toHaveBeenCalled();
  });
});
