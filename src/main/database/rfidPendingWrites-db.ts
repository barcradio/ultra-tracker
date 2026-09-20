import { getDatabaseConnection } from "./connect-db";

export interface RFIDPendingWriteRecord {
  index: number;
  bibId: number;
  tagTimestamp: string;
  receivedAt: string;
  attempts: number;
  lastError: string | null;
}

export function enqueue(bibId: number, tagTimestamp: string): number {
  const db = getDatabaseConnection();
  const result = db
    .prepare(
      `INSERT INTO RFIDPendingWrites (bibId, tagTimestamp, receivedAt, attempts, processed)
       VALUES (?, ?, ?, 0, FALSE)`
    )
    .run(bibId, tagTimestamp, new Date().toISOString());

  return Number(result.lastInsertRowid);
}

export function getPending(): RFIDPendingWriteRecord[] {
  const db = getDatabaseConnection();
  return db
    .prepare(
      `SELECT "index", bibId, tagTimestamp, receivedAt, attempts, lastError
       FROM RFIDPendingWrites WHERE processed = FALSE ORDER BY "index"`
    )
    .all() as RFIDPendingWriteRecord[];
}

export function markProcessed(index: number): void {
  const db = getDatabaseConnection();
  db.prepare(`UPDATE RFIDPendingWrites SET processed = TRUE WHERE "index" = ?`).run(index);
}

export function recordAttemptFailure(index: number, error: string): void {
  const db = getDatabaseConnection();
  db.prepare(
    `UPDATE RFIDPendingWrites SET attempts = attempts + 1, lastError = ? WHERE "index" = ?`
  ).run(error, index);
}
