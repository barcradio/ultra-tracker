import fs from "fs";
import { ipcMain } from "electron";
import { DatabaseStatus } from "$shared/enums";
import { EventDatabaseMetadata } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import {
  createDatabaseFile,
  deleteDatabaseFiles,
  getDbPaths,
  isDatabaseConnected,
  listEventDatabaseBackupSlugs,
  listEventDatabaseSlugs,
  slugify,
  switchToDatabase
} from "../database/connect-db";
import {
  listEventDatabaseBackupsWithMetadata,
  listEventDatabasesWithMetadata
} from "../database/event-databases-db";
import { loadStationsFromFile } from "../database/stations-db";
import * as dialogs from "../lib/file-dialogs";
import { reloadMainWindow } from "../lib/webContents";
import { Handler } from "../types";

function readEventNameFromStationsFile(filePath: string): string {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(fileContent) as { event?: { name?: string } };
  const name = parsed.event?.name;

  if (!name || typeof name !== "string") {
    throw new Error("Stations file is missing an event name");
  }

  return name;
}

function resolveUniqueSlug(baseSlug: string): string {
  const existingSlugs = new Set(listEventDatabaseSlugs());
  if (!existingSlugs.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) suffix++;
  return `${baseSlug}-${suffix}`;
}

const listEventDatabases: Handler<void, Promise<EventDatabaseMetadata[]>> = () => {
  return listEventDatabasesWithMetadata();
};

const isEventDatabaseLoaded: Handler<void, boolean> = () => isDatabaseConnected();

const listEventDatabaseBackups: Handler<void, Promise<EventDatabaseMetadata[]>> = () => {
  return listEventDatabaseBackupsWithMetadata();
};

const createEventDatabase: Handler<void, Promise<DatabaseResponse<string>>> = async () => {
  const filePaths = await dialogs.selectStationsFile();
  const filePath = filePaths?.[0];
  if (!filePath) {
    const response: DatabaseResponse<string> = [
      null,
      DatabaseStatus.Error,
      "No stations file selected"
    ];
    return response;
  }

  try {
    const eventName = readEventNameFromStationsFile(filePath);
    const slug = resolveUniqueSlug(slugify(eventName) || "event");

    createDatabaseFile(slug);
    await loadStationsFromFile(filePath);

    const response: DatabaseResponse<string> = [
      slug,
      DatabaseStatus.Created,
      `Created event database "${slug}"`
    ];
    return response;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to create event database";
    const response: DatabaseResponse<string> = [null, DatabaseStatus.Error, message];
    return response;
  }
};

// Only slugs enumerated from disk are trusted; a renderer-provided slug is never used directly as a path.
const loadEventDatabase: Handler<string, DatabaseResponse> = (_event, slug) => {
  if (typeof slug !== "string" || !listEventDatabaseSlugs().includes(slug)) {
    return [DatabaseStatus.NotFound, "Unknown event database"];
  }

  switchToDatabase(slug);
  reloadMainWindow();

  return [DatabaseStatus.Success, `Loaded event database "${slug}"`];
};

const deleteEventDatabase: Handler<
  { slug: string; type: "database" | "backup" },
  DatabaseResponse
> = (_event, params) => {
  if (
    typeof params?.slug !== "string" ||
    (params.type !== "database" && params.type !== "backup") ||
    !(
      params.type === "database" ? listEventDatabaseSlugs() : listEventDatabaseBackupSlugs()
    ).includes(params.slug)
  ) {
    return [DatabaseStatus.NotFound, "Unknown event database"];
  }

  try {
    deleteDatabaseFiles(params.slug, params.type);
    return [DatabaseStatus.Deleted, `Deleted event ${params.type} "${params.slug}"`];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : `Unable to delete event ${params.type}`;
    return [DatabaseStatus.Error, message];
  }
};

const restoreEventDatabaseBackup: Handler<
  { slug: string; allowRename: boolean },
  DatabaseResponse<string>
> = (_event, params) => {
  if (typeof params?.slug !== "string") return [null, DatabaseStatus.NotFound, "Unknown backup"];

  const { dbPath, dbBackupPath } = getDbPaths(params.slug);
  if (!fs.existsSync(dbBackupPath)) return [null, DatabaseStatus.NotFound, "Unknown backup"];

  const exists = fs.existsSync(dbPath);
  if (exists && !params.allowRename) {
    return [null, DatabaseStatus.Duplicate, "An event database with this name already exists"];
  }

  const slug = exists ? resolveUniqueSlug(params.slug) : params.slug;
  const targetPath = getDbPaths(slug).dbPath;

  try {
    fs.copyFileSync(dbBackupPath, targetPath, fs.constants.COPYFILE_EXCL);
    switchToDatabase(slug);
    reloadMainWindow();
    return [slug, DatabaseStatus.Created, `Restored backup as event database "${slug}"`];
  } catch (e: unknown) {
    return [
      null,
      DatabaseStatus.Error,
      e instanceof Error ? e.message : "Unable to restore backup"
    ];
  }
};

const finishEventSetup: Handler<void, void> = () => {
  reloadMainWindow();
};

export function initEventDatabaseHandlers() {
  ipcMain.handle("list-event-databases", listEventDatabases);
  ipcMain.handle("list-event-database-backups", listEventDatabaseBackups);
  ipcMain.handle("is-event-database-loaded", isEventDatabaseLoaded);
  ipcMain.handle("create-event-database", createEventDatabase);
  ipcMain.handle("finish-event-setup", finishEventSetup);
  ipcMain.handle("load-event-database", loadEventDatabase);
  ipcMain.handle("delete-event-database", deleteEventDatabase);
  ipcMain.handle("restore-event-database-backup", restoreEventDatabaseBackup);
}
