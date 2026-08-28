import { getDatabaseConnection } from "./connect-db";

export type OpenSplitTimePushStatus = "success" | "error";

export interface OpenSplitTimePushStatusRecord {
  bibId: number;
  status: OpenSplitTimePushStatus;
  error: string | null;
  updatedAt: string;
}

// Persisted so a bib's last push outcome survives app restarts and is visible from any station.
export function getPushStatus(bibId: number): OpenSplitTimePushStatusRecord | null {
  const db = getDatabaseConnection();

  try {
    const result = db
      .prepare(
        `SELECT bibId, status, error, updatedAt FROM OpenSplitTimePushStatus WHERE bibId = ?`
      )
      .get(bibId);

    return (result as OpenSplitTimePushStatusRecord) ?? null;
  } catch (e) {
    if (e instanceof Error) console.error(`Failed to read OpenSplitTime push status: ${e.message}`);
    return null;
  }
}

export function setPushStatus(
  bibId: number,
  status: OpenSplitTimePushStatus,
  error?: string
): void {
  const db = getDatabaseConnection();
  const updatedAt = new Date().toISOString();

  try {
    const existing = db
      .prepare(`SELECT "index" FROM OpenSplitTimePushStatus WHERE bibId = ?`)
      .get(bibId);

    if (existing) {
      db.prepare(
        `UPDATE OpenSplitTimePushStatus SET status = ?, error = ?, updatedAt = ? WHERE bibId = ?`
      ).run(status, error ?? null, updatedAt, bibId);
    } else {
      db.prepare(
        `INSERT INTO OpenSplitTimePushStatus (bibId, status, error, updatedAt) VALUES (?, ?, ?, ?)`
      ).run(bibId, status, error ?? null, updatedAt);
    }
  } catch (e) {
    if (e instanceof Error) console.error(`Failed to save OpenSplitTime push status: ${e.message}`);
  }
}
