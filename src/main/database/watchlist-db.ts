import { DatabaseStatus } from "$shared/enums";
import { DatabaseResponse } from "$shared/types";
import { getDatabaseConnection } from "./connect-db";
import { logEvent } from "./eventLogger-db";
import { sendToastToRenderer } from "../ipc/toast-ipc";

export function GetWatchlistCount(): number {
  const db = getDatabaseConnection();

  try {
    const result = db.prepare(`SELECT COUNT(*) AS count FROM Watchlist`).get() as { count: number };
    return result.count;
  } catch (error) {
    if (error instanceof Error) console.error(error.message);
    return -999;
  }
}

export function isWatchlisted(bibId: number): boolean {
  const db = getDatabaseConnection();
  return Boolean(db.prepare(`SELECT 1 FROM Watchlist WHERE bibId = ?`).get(bibId));
}

export function toggleWatchlist(bibId: number): DatabaseResponse<boolean> {
  const db = getDatabaseConnection();
  const watchlisted = db.transaction(() => {
    if (isWatchlisted(bibId)) {
      db.prepare(`DELETE FROM Watchlist WHERE bibId = ?`).run(bibId);
      return false;
    }

    db.prepare(`INSERT INTO Watchlist (bibId) VALUES (?)`).run(bibId);
    return true;
  })();
  const eventTime = new Date().toISOString();

  logEvent(
    bibId,
    null,
    null,
    null,
    eventTime,
    `[${watchlisted ? "Add" : "Remove"}](Watchlist): bib:${bibId}`,
    false,
    false
  );

  return [
    watchlisted,
    DatabaseStatus.Updated,
    `watchlist:${watchlisted ? "added" : "removed"} bib:${bibId}`
  ];
}

export function removeFromWatchlist(bibId: number): DatabaseResponse {
  if (!isWatchlisted(bibId)) return [DatabaseStatus.NotFound, `watchlist: bib:${bibId} not found`];

  return toggleWatchlist(bibId).slice(1) as DatabaseResponse;
}

export function alertForWatchlistedAthlete(bibId: number, event: "arrival" | "drop"): void {
  if (!isWatchlisted(bibId)) return;

  const eventMessage = event === "arrival" ? "arrived at this station" : "was added as a drop";
  const eventTime = new Date().toISOString();
  logEvent(
    bibId,
    null,
    null,
    null,
    eventTime,
    `[Alert](Watchlist): bib:${bibId} ${eventMessage}`,
    false,
    false
  );

  sendToastToRenderer({
    message: `Watchlist alert: athlete #${bibId} ${eventMessage}.`,
    type: "warning",
    timeoutMs: -1,
    action: { type: "remove-watchlist", bibId }
  });
}