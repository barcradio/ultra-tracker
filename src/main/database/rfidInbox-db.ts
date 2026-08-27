import { getDatabaseConnection } from "./connect-db";

export interface RFIDInboxRecord {
  index: number;
  payload: string;
  receivedAt: string;
}

export function enqueue(payload: string): number {
  const db = getDatabaseConnection();
  const result = db
    .prepare(`INSERT INTO RFIDInbox (payload, receivedAt, processed) VALUES (?, ?, FALSE)`)
    .run(payload, new Date().toISOString());

  return Number(result.lastInsertRowid);
}

export function getPending(): RFIDInboxRecord[] {
  const db = getDatabaseConnection();
  return db
    .prepare(
      `SELECT "index", payload, receivedAt FROM RFIDInbox WHERE processed = FALSE ORDER BY "index"`
    )
    .all() as RFIDInboxRecord[];
}

export function markProcessed(index: number): void {
  const db = getDatabaseConnection();
  db.prepare(`UPDATE RFIDInbox SET processed = TRUE WHERE "index" = ?`).run(index);
}
