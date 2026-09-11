import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseStatus } from "../../../shared/enums";
import { initEventDatabaseHandlers } from "../event-databases-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

let workDir: string;

const connect = vi.hoisted(() => ({
  createDatabaseFile: vi.fn(),
  deleteDatabaseFiles: vi.fn(),
  getDbPaths: vi.fn(),
  isDatabaseConnected: vi.fn(() => true),
  listEventDatabaseBackupSlugs: vi.fn(() => ["old-race"]),
  listEventDatabaseSlugs: vi.fn(() => ["bear-100"]),
  resolveUniqueSlug: vi.fn((slug: string) => `${slug}-2`),
  slugify: vi.fn((name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  ),
  switchToDatabase: vi.fn()
}));
vi.mock("../../database/connect-db", () => connect);

const archive = vi.hoisted(() => ({
  importEventArchiveFile: vi.fn(async () => ["bear-100", 0, "Created"]),
  previewEventArchiveFile: vi.fn(() => [{ eventName: "Bear 100" }, 6, "Loaded"])
}));
vi.mock("../../database/event-archive-db", () => archive);

const metadata = vi.hoisted(() => ({
  listEventDatabasesWithMetadata: vi.fn(async () => [{ slug: "bear-100" }]),
  listEventDatabaseBackupsWithMetadata: vi.fn(async () => [{ slug: "old-race" }])
}));
vi.mock("../../database/event-databases-db", () => metadata);

const stations = vi.hoisted(() => ({
  loadStationsFromFile: vi.fn(async () => "1 stations imported"),
  readEventNameFromStationsFile: vi.fn(() => "Bear 100")
}));
vi.mock("../../database/stations-db", () => stations);

const dialogs = vi.hoisted(() => ({
  selectStationsFile: vi.fn(),
  selectEventArchiveFile: vi.fn()
}));
vi.mock("../../lib/file-dialogs", () => dialogs);

const reloadMainWindow = vi.hoisted(() => vi.fn());
vi.mock("../../lib/webContents", () => ({ reloadMainWindow }));

function handlerFor(channel: string) {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new Error(`${channel} handler was not registered`);
  return handler;
}

function makeZip(name = "event.zip") {
  const target = path.join(workDir, name);
  fs.writeFileSync(target, "zip bytes");
  return target;
}

describe("event-databases-ipc", () => {
  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-eventdb-"));
    ipcHandlers.clear();
    vi.clearAllMocks();
    connect.listEventDatabaseSlugs.mockReturnValue(["bear-100"]);
    connect.listEventDatabaseBackupSlugs.mockReturnValue(["old-race"]);
    connect.resolveUniqueSlug.mockImplementation((slug: string) => `${slug}-2`);
    connect.getDbPaths.mockImplementation((slug: string) => ({
      dbFolder: workDir,
      dbPath: path.join(workDir, `${slug}.db`),
      dbBackupPath: path.join(workDir, `${slug}-backup.db`)
    }));
    stations.readEventNameFromStationsFile.mockReturnValue("Bear 100");
    stations.loadStationsFromFile.mockResolvedValue("1 stations imported");
    archive.importEventArchiveFile.mockResolvedValue(["bear-100", 0, "Created"]);
    initEventDatabaseHandlers();
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it("lists the event databases", async () => {
    await expect(handlerFor("list-event-databases")(undefined)).resolves.toEqual([
      { slug: "bear-100" }
    ]);
  });

  it("lists the backups", async () => {
    await expect(handlerFor("list-event-database-backups")(undefined)).resolves.toEqual([
      { slug: "old-race" }
    ]);
  });

  it("reports whether a database is open", () => {
    expect(handlerFor("is-event-database-loaded")(undefined)).toBe(true);
  });

  it("reloads the window when setup finishes", () => {
    handlerFor("finish-event-setup")(undefined);

    expect(reloadMainWindow).toHaveBeenCalled();
  });

  describe("create-event-database", () => {
    it("creates a database named after the event in the stations file", async () => {
      dialogs.selectStationsFile.mockResolvedValue(["/tmp/stations.json"]);

      const [slug, status] = (await handlerFor("create-event-database")(undefined)) as [
        string,
        DatabaseStatus
      ];

      expect(status).toBe(DatabaseStatus.Created);
      expect(slug).toBe("bear-100-2");
      expect(connect.createDatabaseFile).toHaveBeenCalledWith("bear-100-2");
      expect(stations.loadStationsFromFile).toHaveBeenCalledWith("/tmp/stations.json");
    });

    it("reports when the operator cancels the dialog", async () => {
      dialogs.selectStationsFile.mockResolvedValue(undefined);

      const [, status, message] = (await handlerFor("create-event-database")(undefined)) as [
        null,
        DatabaseStatus,
        string
      ];

      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toBe("No stations file selected");
    });

    it("reports an unreadable stations file", async () => {
      dialogs.selectStationsFile.mockResolvedValue(["/tmp/stations.json"]);
      stations.readEventNameFromStationsFile.mockImplementation(() => {
        throw new Error("Stations file is missing an event name");
      });

      const [, status, message] = (await handlerFor("create-event-database")(undefined)) as [
        null,
        DatabaseStatus,
        string
      ];

      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toBe("Stations file is missing an event name");
    });
  });

  describe("create-event-database-from-archive", () => {
    it("imports a real zip file", async () => {
      const zip = makeZip();

      await handlerFor("create-event-database-from-archive")(undefined, zip);

      expect(archive.importEventArchiveFile).toHaveBeenCalledWith(zip);
    });

    it("refuses a path that is not a zip", async () => {
      const txt = path.join(workDir, "event.txt");
      fs.writeFileSync(txt, "nope");

      const [, status, message] = (await handlerFor("create-event-database-from-archive")(
        undefined,
        txt
      )) as [null, DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toBe("Invalid event file selected");
    });

    it("refuses a zip path that does not exist", async () => {
      const [, status] = (await handlerFor("create-event-database-from-archive")(
        undefined,
        path.join(workDir, "missing.zip")
      )) as [null, DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.Error);
    });

    it("refuses a non-string path from the renderer", async () => {
      const [, status] = (await handlerFor("create-event-database-from-archive")(
        undefined,
        42
      )) as [null, DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.Error);
    });
  });

  describe("select-event-archive-preview", () => {
    it("previews the chosen archive", async () => {
      const zip = makeZip();
      dialogs.selectEventArchiveFile.mockResolvedValue([zip]);

      await handlerFor("select-event-archive-preview")(undefined);

      expect(archive.previewEventArchiveFile).toHaveBeenCalledWith(zip);
    });

    it("reports when the operator cancels", async () => {
      dialogs.selectEventArchiveFile.mockResolvedValue(undefined);

      const [, status, message] = (await handlerFor("select-event-archive-preview")(undefined)) as [
        null,
        DatabaseStatus,
        string
      ];

      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toBe("No event file selected");
    });

    it("refuses a chosen file that is not a zip", async () => {
      const txt = path.join(workDir, "event.txt");
      fs.writeFileSync(txt, "nope");
      dialogs.selectEventArchiveFile.mockResolvedValue([txt]);

      const [, status, message] = (await handlerFor("select-event-archive-preview")(undefined)) as [
        null,
        DatabaseStatus,
        string
      ];

      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toBe("Invalid event file selected");
    });
  });

  describe("load-event-database", () => {
    it("switches to a database that exists on disk", () => {
      const [status, message] = handlerFor("load-event-database")(undefined, "bear-100") as [
        DatabaseStatus,
        string
      ];

      expect(status).toBe(DatabaseStatus.Success);
      expect(message).toContain("bear-100");
      expect(connect.switchToDatabase).toHaveBeenCalledWith("bear-100");
      expect(reloadMainWindow).toHaveBeenCalled();
    });

    it("refuses a slug the renderer invented", () => {
      const [status] = handlerFor("load-event-database")(undefined, "../../etc/passwd") as [
        DatabaseStatus,
        string
      ];

      expect(status).toBe(DatabaseStatus.NotFound);
      expect(connect.switchToDatabase).not.toHaveBeenCalled();
    });

    it("refuses a non-string slug", () => {
      const [status] = handlerFor("load-event-database")(undefined, 42) as [DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.NotFound);
    });
  });

  describe("delete-event-database", () => {
    it("deletes a known database", () => {
      const [status] = handlerFor("delete-event-database")(undefined, {
        slug: "bear-100",
        type: "database"
      }) as [DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.Deleted);
      expect(connect.deleteDatabaseFiles).toHaveBeenCalledWith("bear-100", "database");
    });

    it("deletes a known backup", () => {
      const [status] = handlerFor("delete-event-database")(undefined, {
        slug: "old-race",
        type: "backup"
      }) as [DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.Deleted);
    });

    it("refuses an unknown slug", () => {
      const [status] = handlerFor("delete-event-database")(undefined, {
        slug: "nope",
        type: "database"
      }) as [DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.NotFound);
      expect(connect.deleteDatabaseFiles).not.toHaveBeenCalled();
    });

    it("refuses an unknown type", () => {
      const [status] = handlerFor("delete-event-database")(undefined, {
        slug: "bear-100",
        type: "everything"
      }) as [DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.NotFound);
    });

    it("reports a delete that fails", () => {
      connect.deleteDatabaseFiles.mockImplementation(() => {
        throw new Error("Cannot delete the active database");
      });

      const [status, message] = handlerFor("delete-event-database")(undefined, {
        slug: "bear-100",
        type: "database"
      }) as [DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toBe("Cannot delete the active database");
    });
  });

  describe("restore-event-database-backup", () => {
    it("restores a backup under its own name when nothing would be overwritten", () => {
      fs.writeFileSync(path.join(workDir, "old-race-backup.db"), "backup");

      const [slug, status] = handlerFor("restore-event-database-backup")(undefined, {
        slug: "old-race",
        allowRename: false
      }) as [string, DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.Created);
      expect(slug).toBe("old-race");
      expect(connect.switchToDatabase).toHaveBeenCalledWith("old-race");
    });

    it("refuses to overwrite an existing database unless renaming is allowed", () => {
      fs.writeFileSync(path.join(workDir, "old-race-backup.db"), "backup");
      fs.writeFileSync(path.join(workDir, "old-race.db"), "existing");

      const [, status, message] = handlerFor("restore-event-database-backup")(undefined, {
        slug: "old-race",
        allowRename: false
      }) as [null, DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.Duplicate);
      expect(message).toBe("An event database with this name already exists");
    });

    it("restores under a fresh name when renaming is allowed", () => {
      fs.writeFileSync(path.join(workDir, "old-race-backup.db"), "backup");
      fs.writeFileSync(path.join(workDir, "old-race.db"), "existing");

      const [slug, status] = handlerFor("restore-event-database-backup")(undefined, {
        slug: "old-race",
        allowRename: true
      }) as [string, DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.Created);
      expect(slug).toBe("old-race-2");
    });

    it("reports a missing backup", () => {
      const [, status, message] = handlerFor("restore-event-database-backup")(undefined, {
        slug: "old-race",
        allowRename: false
      }) as [null, DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.NotFound);
      expect(message).toBe("Unknown backup");
    });

    it("refuses a non-string slug", () => {
      const [, status] = handlerFor("restore-event-database-backup")(undefined, {
        slug: 42,
        allowRename: false
      }) as [null, DatabaseStatus, string];

      expect(status).toBe(DatabaseStatus.NotFound);
    });
  });
});
