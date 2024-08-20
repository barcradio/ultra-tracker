import fs from "fs";
import { parse } from "csv-parse";
import { formatDate } from "$renderer/lib/datetimes";
import { Runner, RunnerDB } from "$shared/models";
import { getDatabaseConnection } from "./connect-db";
import { insertOrUpdateTimeRecord } from "./timingRecords-db";
import { data } from "../../preload/data";
import { loadRunnersFromCSV, saveRunnersToCSV } from "../lib/file-dialogs";
import { parseISO } from "date-fns";

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

export async function importRunnersFromCSV() {
  const headers = ["index", "sent", "bibId", "timeIn", "timeOut", "note"];
  const runnerCSVFilePath = await loadRunnersFromCSV();
  const fileContent = fs.readFileSync(runnerCSVFilePath[0], { encoding: "utf-8" });

  parse(
    fileContent,
    {
      delimiter: ",",
      columns: headers,
      from_line: 2
    },
    (error, result: Runner[]) => {
      if (error) {
        console.error(error);
        return `${result.length} timings: ${error}`;
      }

      console.log("Result", result);

      result.slice(1).forEach((timing) => {
        const record: RunnerDB = {
          index: timing.bibId,
          bibId: timing.bibId,
          stationId: data.station.id,
          timeIn: parseCSVDate(timing.timeIn),
          timeOut: parseCSVDate(timing.timeOut),
          timeModified: new Date(),
          note: timing.note,
          sent: false
        };

        function parseCSVDate(timingDate: string): Date {
          const event = new Date(Date.parse(timingDate));
          event.setFullYear(new Date().getFullYear());
          return event;
        }

        insertOrUpdateTimeRecord(record);
      });
      return `${runnerCSVFilePath}\r\n${result.length} timings imported`;
    }
  );
}

export async function exportRunnersAsCSV() {
  const db = getDatabaseConnection();

  try {
    const stmt = db.prepare(`SELECT * FROM StaEvents`);

    //const filePath: string = app.getPath("downloads");
    // const path = require("path");
    // const filename: string = path.join(filePath[0], "Aid5times.csv");
    const filename: string = await saveRunnersToCSV();

    if (filename == undefined) return "Invalid file name";

    writeToCSV(filename, stmt);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return e.message;
    }
  }
  return "File Export Successful";
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
