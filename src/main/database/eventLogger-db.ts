import { DatabaseStatus } from "$shared/models";
import { getDatabaseConnection } from "./connect-db";

export function logEvent(
  bibId: number,
  stationId: number,
  timeIn: string,
  timeOut: string,
  timeModified: string,
  comments: string,
  sent: boolean,
  verbose: boolean
): [DatabaseStatus, string] {
  const db = getDatabaseConnection();

  try {
    const queryResult = db.prepare(
      `INSERT INTO EventLog (bibId, stationId, timeIn, timeOut, timeModified, comments, sent, verbose) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    queryResult.run(
      bibId,
      stationId,
      timeIn,
      timeOut,
      timeModified,
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
