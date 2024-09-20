import { DatabaseStatus } from "$shared/enums";
import { EventLogRec } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { getDatabaseConnection } from "./connect-db";
import { appStore } from "../lib/store";

export function logEvent(
  bibId: number,
  stationId: string | null,
  timeIn: string | null,
  timeOut: string | null,
  timeModified: string | null,
  comments: string,
  sent: boolean,
  verbose: boolean
): [DatabaseStatus, string] {
  const db = getDatabaseConnection();
  const stationIdentifier: string | null = appStore.get("station.identifier") as string;

  try {
    const queryResult = db.prepare(
      `INSERT INTO EventLog (bibId, stationId, timeIn, timeOut, timeModified, comments, sent, verbose) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    queryResult.run(
      bibId,
      stationId == null ? stationIdentifier : stationId,
      timeIn == null ? "" : timeIn,
      timeOut == null ? "" : timeOut,
      timeModified == null ? "" : timeModified,
      comments,
      Number(sent),
      Number(verbose)
    );
  } catch (e: unknown) {
    if (e instanceof Error) console.log(`Failed to insert log record: ${e.message}`);
    return [DatabaseStatus.Error, "Unable to add logEvent record."];
  }
  return [DatabaseStatus.Success, ""];
}

export function getEventLogs(verbose: boolean = false): DatabaseResponse<EventLogRec[]> {
  const db = getDatabaseConnection();
  let queryResult;

  try {
    queryResult = db.prepare(`SELECT * FROM EventLog WHERE verbose = ?`).all(Number(verbose));
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log(`Failed to get log records: ${e.message}`);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  queryResult.forEach((row) => {
    row.timeIn = row.timeIn == "" ? null : new Date(row.timeIn);
    row.timeOut = row.timeOut == "" ? null : new Date(row.timeOut);
    row.timeModified = row.timeModified == "" ? null : new Date(row.timeModified);
  });
  return [queryResult, DatabaseStatus.Success, ""];
}
