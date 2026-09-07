import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { app } from "electron";
import { EventDatabaseMetadata } from "$shared/models";
import { getDbPaths, listEventDatabaseBackupSlugs, listEventDatabaseSlugs } from "./connect-db";

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

export async function getEventDatabaseMetadata(
  slug: string,
  type: EventDatabaseMetadata["type"]
): Promise<EventDatabaseMetadata> {
  const { dbPath, dbBackupPath } = getDbPaths(slug);
  const filePath = type === "database" ? dbPath : dbBackupPath;
  let temporaryDirectory: string | undefined;

  try {
    temporaryDirectory = fs.mkdtempSync(
      path.join(app.getPath("temp"), "ultra-tracker-event-metadata-")
    );
    const metadataFilePath = path.join(temporaryDirectory, path.basename(filePath));
    fs.copyFileSync(filePath, metadataFilePath);
    const db = new Database(metadataFilePath, { readonly: true, fileMustExist: true });
    try {
      const eventMeta = db.prepare(`SELECT * FROM EventMeta LIMIT 1`).get() as
        EventMetaRow | undefined;
      const timingRecordCount = (
        db.prepare(`SELECT COUNT(*) AS count FROM TimeRecords`).get() as CountRow
      ).count;
      const athleteCount = (db.prepare(`SELECT COUNT(*) AS count FROM Athletes`).get() as CountRow)
        .count;

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
    } finally {
      db.close();
    }
  } catch {
    return { slug, type, error: "unreadable" };
  } finally {
    if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
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
