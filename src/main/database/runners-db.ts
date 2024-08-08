import Database, { Statement } from "better-sqlite3";
import global from "../../shared/global";

export function ReadRunnersTable() {
  const db: Database = global.shared.dbConnection;
  let result: string = "";
  let CmdResult: Statement;
  let dataset: Array<object> = [];

  try {
    CmdResult = db.prepare(`SELECT * FROM Runners`);
    dataset = CmdResult.all();

    if (dataset instanceof Array) {
      result = `Read Runners table succeeded - records:${dataset.length}`;
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(result);
    }
  }

  console.log(result);
  return dataset;
}
