import { app } from "electron";
import { formatDate } from "$renderer/lib/datetimes";
import { Runner } from "$shared/models";
import { getDatabaseConnection } from "./connect-db";
import { data } from "../../preload/data";

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

export function exportRunnersAsCSV() {
  const db = getDatabaseConnection();

  try {
    const stmt = db.prepare(`SELECT * FROM StaEvents`);

    const filePath: string = app.getPath("downloads");
    const path = require("path");
    const filename: string = path.join(filePath, "Aid5times.csv");

    writeToCSV(filename, stmt);
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
  }
}

function* toRows(stmt) {
  yield stmt.columns().map((column) => column.name);
  yield* stmt.raw().iterate();
}

function writeToCSV(filename, stmt) {
  const fs = require("fs");

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filename);
    let sequence = -1;

    // title row
    const event = data.event.name;
    const station = data.station.name;
    const disclaimer = "All times are based off of the system they were recorded on.";
    const rowText = `${event},${station},${disclaimer}`;
    stream.write(rowText + "\n");

    for (const row of toRows(stmt)) {
      // headers
      if (sequence == -1) {
        const rowText = `${row[0]},${row[7]},${row[1]},${row[3]},${row[4]},${row[6]}`;
        stream.write(rowText + "\n");
        sequence++;
        continue;
      }

      const record: Runner = {
        id: row.index,
        sequence: sequence + 1,
        runner: row[1],
        in: row[3] == null ? "" : formatDate(new Date(row[3])),
        out: row[4] == null ? "" : formatDate(new Date(row[4])),
        notes: row[6]
      };
      const sent = row[7];

      const rowText = `${record.sequence},${sent},${record.runner},${record.in},${record.out},${record.notes}`;
      stream.write(rowText + "\n");
      sequence++;
    }
    stream.on("error", reject);
    stream.end(resolve);
  });
}
