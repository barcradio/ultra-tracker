import { getDatabaseConnection } from "./connect-db";

export function readRunnersTable() {
  const db = getDatabaseConnection();

  try {
    const query = db.prepare(`SELECT * FROM StaEvents`);
    const dataset = query.all();
    console.log(`table Read StaEvents - records:${dataset.length}`);
    return dataset;
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
    return [];
  }
}
