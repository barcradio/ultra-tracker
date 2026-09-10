import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseStatus } from "$shared/enums";
import { initAthleteHandlers } from "../athletes-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const GetAthletes = vi.hoisted(() => vi.fn());
const GetAthleteByBib = vi.hoisted(() => vi.fn());
vi.mock("../../database/athlete-db", () => ({ GetAthletes, GetAthleteByBib }));

const toggleWatchlist = vi.hoisted(() => vi.fn());
const removeFromWatchlist = vi.hoisted(() => vi.fn());
vi.mock("../../database/watchlist-db", () => ({ toggleWatchlist, removeFromWatchlist }));

const Calculate = vi.hoisted(() => vi.fn());
vi.mock("../../lib/stat-engine", () => ({ Calculate }));

describe("athletes-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    initAthleteHandlers();
  });

  function invoke(channel: string, param?: unknown) {
    const handler = ipcHandlers.get(channel);
    if (!handler) throw new Error(`${channel} handler was not registered`);
    return handler(undefined, param);
  }

  it("get-athletes-table forwards to GetAthletes", () => {
    GetAthletes.mockReturnValue([[], DatabaseStatus.Success, ""]);

    const result = invoke("get-athletes-table");

    expect(GetAthletes).toHaveBeenCalled();
    expect(result).toEqual([[], DatabaseStatus.Success, ""]);
  });

  it("get-athlete-by-bib forwards the bib number", () => {
    GetAthleteByBib.mockReturnValue([null, DatabaseStatus.NotFound, ""]);

    invoke("get-athlete-by-bib", 101);

    expect(GetAthleteByBib).toHaveBeenCalledWith(101);
  });

  describe("toggle-watchlist", () => {
    it.each([0, -5, 1.5, "101", null, undefined])("rejects an invalid bib number: %s", (bibId) => {
      const result = invoke("toggle-watchlist", bibId);

      expect(result).toEqual([null, DatabaseStatus.Error, "Invalid bib number"]);
      expect(toggleWatchlist).not.toHaveBeenCalled();
    });

    it("toggles the watchlist and recalculates stats for a valid bib", () => {
      toggleWatchlist.mockReturnValue([true, DatabaseStatus.Updated, "watchlist:added bib:101"]);

      const result = invoke("toggle-watchlist", 101);

      expect(toggleWatchlist).toHaveBeenCalledWith(101);
      expect(Calculate).toHaveBeenCalled();
      expect(result).toEqual([true, DatabaseStatus.Updated, "watchlist:added bib:101"]);
    });
  });

  describe("remove-from-watchlist", () => {
    it("rejects an invalid bib number without calling the database", () => {
      const result = invoke("remove-from-watchlist", -1);

      expect(result).toEqual([DatabaseStatus.Error, "Invalid bib number"]);
      expect(removeFromWatchlist).not.toHaveBeenCalled();
    });

    it("removes a valid bib and recalculates stats", () => {
      removeFromWatchlist.mockReturnValue([DatabaseStatus.Updated, "watchlist:removed bib:101"]);

      const result = invoke("remove-from-watchlist", 101);

      expect(removeFromWatchlist).toHaveBeenCalledWith(101);
      expect(Calculate).toHaveBeenCalled();
      expect(result).toEqual([DatabaseStatus.Updated, "watchlist:removed bib:101"]);
    });
  });
});
