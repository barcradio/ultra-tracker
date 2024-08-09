import { getDatabaseConnection } from "./connect";

export function readRunnersTable() {
  const db = getDatabaseConnection();

  try {
    const query = db.prepare(`SELECT * FROM Runners`);
    const dataset = query.all();
    console.log(`table Read Runners succeeded - records:${dataset.length}`);
    return dataset;
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
    return [];
  }
}
