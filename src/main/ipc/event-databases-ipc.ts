import fs from "fs";
import { ipcMain } from "electron";
import { DatabaseStatus } from "$shared/enums";
import { EventDatabaseMetadata } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import {
  createDatabaseFile,
  deleteDatabaseFiles,
  listEventDatabaseSlugs,
  slugify,
  switchToDatabase
} from "../database/connect-db";
import { listEventDatabasesWithMetadata } from "../database/event-databases-db";
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
    reloadMainWindow();

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

const deleteEventDatabase: Handler<string, DatabaseResponse> = (_event, slug) => {
  if (typeof slug !== "string" || !listEventDatabaseSlugs().includes(slug)) {
    return [DatabaseStatus.NotFound, "Unknown event database"];
  }

  try {
    deleteDatabaseFiles(slug);
    return [DatabaseStatus.Deleted, `Deleted event database "${slug}"`];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to delete event database";
    return [DatabaseStatus.Error, message];
  }
};

export function initEventDatabaseHandlers() {
  ipcMain.handle("list-event-databases", listEventDatabases);
  ipcMain.handle("create-event-database", createEventDatabase);
  ipcMain.handle("load-event-database", loadEventDatabase);
  ipcMain.handle("delete-event-database", deleteEventDatabase);
}
