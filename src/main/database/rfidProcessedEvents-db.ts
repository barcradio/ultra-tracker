import { getDatabaseConnection } from "./connect-db";

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
