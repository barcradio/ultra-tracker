import fs from "fs";
import Database from "better-sqlite3";
import { EventDatabaseMetadata } from "$shared/models";
import {
  getDatabaseConnection,
  getDbPaths,
  isDatabaseConnected,
  listEventDatabaseBackupSlugs,
  listEventDatabaseSlugs
} from "./connect-db";
import { appStore } from "../lib/store";

interface EventMetaRow {
  name: string | null;
  startline: string | null;
  finishline: string | null;
  starttime: string | null;
  endtime: string | null;
}

interface CountRow {
  count: number;
}

function readEventDatabaseMetadata(
  connection: Database.Database,
  slug: string,
  type: EventDatabaseMetadata["type"],
  filePath: string
): EventDatabaseMetadata {
  const eventMeta = connection.prepare(`SELECT * FROM EventMeta LIMIT 1`).get() as
    EventMetaRow | undefined;
  const timingRecordCount = (
    connection.prepare(`SELECT COUNT(*) AS count FROM TimeRecords`).get() as CountRow
  ).count;
  const athleteCount = (
    connection.prepare(`SELECT COUNT(*) AS count FROM Athletes`).get() as CountRow
  ).count;

  return {
    slug,
    name: eventMeta?.name ?? undefined,
    startline: eventMeta?.startline ?? undefined,
    finishline: eventMeta?.finishline ?? undefined,
    starttime: eventMeta?.starttime ? new Date(eventMeta.starttime) : undefined,
    endtime: eventMeta?.endtime ? new Date(eventMeta.endtime) : undefined,
    timingRecordCount,
    athleteCount,
    lastModified: fs.statSync(filePath).mtime,
    type
  };
}

export async function getEventDatabaseMetadata(
  slug: string,
  type: EventDatabaseMetadata["type"]
): Promise<EventDatabaseMetadata> {
  const { dbPath, dbBackupPath } = getDbPaths(slug);
  const filePath = type === "database" ? dbPath : dbBackupPath;
  const isActiveDatabase =
    type === "database" &&
    isDatabaseConnected() &&
    appStore.get("event.activeDatabaseSlug") === slug;

  try {
    // Read the active database through its live connection instead of opening a second one,
    // since a concurrent WAL writer makes a fresh connection to the same file unreliable.
    if (isActiveDatabase) {
      return readEventDatabaseMetadata(getDatabaseConnection(), slug, type, filePath);
    }

    const connection = new Database(filePath, { fileMustExist: true });
    try {
      return readEventDatabaseMetadata(connection, slug, type, filePath);
    } finally {
      try {
        // Checkpoints and merges the WAL back into the main file, removing the -wal/-shm
        // sidecars this readonly-style enumeration read would otherwise leave behind.
        connection.pragma("journal_mode = DELETE");
      } catch (e: unknown) {
        console.log(`Unable to checkpoint database "${slug}" after enumeration:`, e);
      }
      connection.close();
    }
  } catch {
    return { slug, type, error: "unreadable" };
  }
}

export function listEventDatabasesWithMetadata(): Promise<EventDatabaseMetadata[]> {
  return Promise.all(
    listEventDatabaseSlugs().map((slug) => getEventDatabaseMetadata(slug, "database"))
  );
}

export function listEventDatabaseBackupsWithMetadata(): Promise<EventDatabaseMetadata[]> {
  return Promise.all(
    listEventDatabaseBackupSlugs().map((slug) => getEventDatabaseMetadata(slug, "backup"))
  );
}
