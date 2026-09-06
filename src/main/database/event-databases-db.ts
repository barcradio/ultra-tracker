import fs from "fs";
import Database from "better-sqlite3";
import { EventDatabaseMetadata } from "$shared/models";
import { getDbPaths, listEventDatabaseSlugs } from "./connect-db";

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

export async function getEventDatabaseMetadata(slug: string): Promise<EventDatabaseMetadata> {
  const { dbPath, dbBackupPath } = getDbPaths(slug);

  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
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
        lastModified: fs.statSync(dbPath).mtime,
        hasBackup: fs.existsSync(dbBackupPath)
      };
    } finally {
      db.close();
    }
  } catch {
    return { slug, error: "unreadable" };
  }
}

export function listEventDatabasesWithMetadata(): Promise<EventDatabaseMetadata[]> {
  return Promise.all(listEventDatabaseSlugs().map((slug) => getEventDatabaseMetadata(slug)));
}
