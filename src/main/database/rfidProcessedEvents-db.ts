import { getDatabaseConnection } from "./connect-db";

export function claimProcessed(eventKey: string): boolean {
  const db = getDatabaseConnection();
  const result = db
    .prepare(`INSERT OR IGNORE INTO RFIDProcessedEvents (eventKey, processedAt) VALUES (?, ?)`)
    .run(eventKey, new Date().toISOString());
  return result.changes > 0;
}

export function hasProcessed(eventKey: string): boolean {
  const db = getDatabaseConnection();
  const row = db.prepare(`SELECT 1 FROM RFIDProcessedEvents WHERE eventKey = ?`).get(eventKey);
  return row !== undefined;
}

export function markProcessed(eventKey: string): void {
  const db = getDatabaseConnection();
  db.prepare(`INSERT OR IGNORE INTO RFIDProcessedEvents (eventKey, processedAt) VALUES (?, ?)`).run(
    eventKey,
    new Date().toISOString()
  );
}
