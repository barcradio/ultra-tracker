import { Database } from "better-sqlite3";
import global from "../../shared/global";

export function readRunnersTable() {
  const db: Database = global.shared.dbConnection;

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
