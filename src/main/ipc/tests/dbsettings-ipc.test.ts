import { beforeEach, describe, expect, it, vi } from "vitest";
import { initdbSettingsHandlers } from "../dbsettings-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const dbAthlete = vi.hoisted(() => ({ LoadAthletes: vi.fn(async () => ["2 athletes imported"]) }));
vi.mock("../../database/athlete-db", () => dbAthlete);

const dbStations = vi.hoisted(() => ({ LoadStations: vi.fn(async () => "3 stations imported") }));
vi.mock("../../database/stations-db", () => dbStations);

const dbStatus = vi.hoisted(() => ({ LoadDrops: vi.fn(async () => "drops imported") }));
vi.mock("../../database/status-db", () => dbStatus);

const dbRunners = vi.hoisted(() => ({
  importRunnersFromCSV: vi.fn(async () => "runners imported")
}));
vi.mock("../../database/runners-db", () => dbRunners);

const dbTables = vi.hoisted(() => ({
  CreateTables: vi.fn(() => "tables created"),
  ClearTables: vi.fn(() => "Database tables cleared; Reinitialize or Restart!")
}));
vi.mock("../../database/tables-db", () => dbTables);

const reloadEventArchiveFile = vi.hoisted(() => vi.fn(async () => "archive reloaded"));
vi.mock("../../database/event-archive-db", () => ({ reloadEventArchiveFile }));

vi.mock("../../database/connect-db", () => ({ getDatabaseConnection: vi.fn(() => ({})) }));

const storeMock = vi.hoisted(() => {
  const data = new Map<string, unknown>();
  return {
    data,
    get: vi.fn((key: string) => data.get(key)),
    set: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    })
  };
});
vi.mock("../../lib/store", () => ({ appStore: storeMock }));

function handlerFor(channel: string) {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new Error(`${channel} handler was not registered`);
  return handler;
}

const senderEvent = { sender: { mainFrame: { url: "app://index.html" } } };

describe("dbsettings-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    storeMock.data.clear();
    vi.clearAllMocks();
    dbTables.ClearTables.mockReturnValue("Database tables cleared; Reinitialize or Restart!");
    initdbSettingsHandlers();
  });

  it("loads the athletes file", async () => {
    await expect(handlerFor("load-athletes-file")(senderEvent, "args")).resolves.toEqual([
      "2 athletes imported"
    ]);
  });

  it("loads the stations file", async () => {
    await expect(handlerFor("load-stations-file")(undefined)).resolves.toBe("3 stations imported");
  });

  it("loads the drops file", async () => {
    await expect(handlerFor("load-drops-file")(undefined)).resolves.toBe("drops imported");
  });

  it("imports a runners file", async () => {
    await expect(handlerFor("import-runners-file")(undefined)).resolves.toBe("runners imported");
  });

  it("initializes the database tables", () => {
    expect(handlerFor("initialize-database")(undefined)).toBe("tables created");
  });

  it("reloads the event archive", async () => {
    await expect(handlerFor("reload-events-file")(undefined)).resolves.toBe("archive reloaded");
  });

  describe("clear-database", () => {
    it("resets the incremental export counter once the tables are cleared", () => {
      handlerFor("clear-database")(undefined);

      expect(storeMock.data.get("incrementalFileIndex")).toBe(1);
    });

    it("leaves the counter alone when the tables were not cleared", () => {
      dbTables.ClearTables.mockReturnValue("Failed to clear tables");

      handlerFor("clear-database")(undefined);

      expect(storeMock.data.get("incrementalFileIndex")).toBeUndefined();
    });
  });
});
