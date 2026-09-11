import { beforeEach, describe, expect, it, vi } from "vitest";
import { Calculate, initStatEngine } from "../stat-engine";

const dbAthlete = vi.hoisted(() => ({ GetTotalAthletes: vi.fn(() => 100) }));
vi.mock("../../database/athlete-db", () => dbAthlete);

const dbRunners = vi.hoisted(() => ({
  GetTotalRunners: vi.fn(() => 40),
  GetRunnersInStation: vi.fn(() => 5),
  GetRunnersOutStation: vi.fn(() => 35),
  GetDidNotStartRunnersInStation: vi.fn(() => 1),
  GetUnknownRunners: vi.fn(() => 2),
  GetRunnersWithDuplicateStatus: vi.fn(() => 3)
}));
vi.mock("../../database/runners-db", () => dbRunners);

const dbStatus = vi.hoisted(() => ({
  GetTotalDidNotStart: vi.fn(() => 10),
  GetPreviousDropped: vi.fn(() => 6),
  GetStationDropped: vi.fn(() => 4),
  GetTotalDropped: vi.fn(() => 12)
}));
vi.mock("../../database/status-db", () => dbStatus);

const dbWatchlist = vi.hoisted(() => ({ GetWatchlistCount: vi.fn(() => 7) }));
vi.mock("../../database/watchlist-db", () => dbWatchlist);

describe("stat-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports every registered statistic", () => {
    initStatEngine();

    const stats = Calculate();

    expect(stats).toMatchObject({
      registeredAthletes: 100,
      totalRunners: 40,
      totalDidNotStart: 10,
      previousDrops: 6,
      inStation: 5,
      throughStation: 35,
      stationDrops: 4,
      totalDrops: 12,
      watchlistCount: 7,
      inStationDidNotStart: 1,
      unknownAthletes: 2,
      duplicates: 3
    });
  });

  it("derives pending arrivals from the registered, dropped and recorded counts", () => {
    initStatEngine();

    // 100 registered - 10 did-not-start - 6 previous drops - 40 already recorded
    expect(Calculate().pendingArrivals).toBe(44);
  });

  it("recalculates from the database on every call", () => {
    initStatEngine();
    Calculate();
    dbRunners.GetTotalRunners.mockReturnValue(41);

    expect(Calculate().totalRunners).toBe(41);
  });

  it("marks statistics that have no data source as unavailable", () => {
    initStatEngine();

    const stats = Calculate();

    expect(stats.warnings).toBe(-999);
    expect(stats.errors).toBe(-999);
    expect(stats.finishedRace).toBe(-999);
  });
});
