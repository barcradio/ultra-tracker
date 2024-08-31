import fs from "fs";
import { parse } from "csv-parse";
import appSettings from "electron-settings";
import { formatDate } from "$renderer/lib/datetimes";
import { DatabaseStatus, RecordStatus } from "$shared/enums";
import { RunnerCSV, RunnerDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { getDatabaseConnection } from "./connect-db";
import { insertOrUpdateTimeRecord, markTimeRecordAsSent } from "./timingRecords-db";
import { AppPaths, loadRunnersFromCSV, saveRunnersToCSV } from "../lib/file-dialogs";

const invalidResult = -999;

export function GetTotalRunners(): number {
  const count = getTotalRunners();
  return count[0] == null ? invalidResult : count[0];
}

export function GetRunnersInStation(): number {
  const count = getRunnersInStation();
  return count[0] == null ? invalidResult : count[0];
}

export function GetRunnersOutStation(): number {
  const count = getRunnersOutStation();
  return count[0] == null ? invalidResult : count[0];
}

export function GetRunnersWithDuplicateStatus(): number {
  const count = getRunnersWithDuplicateStatus();
  return count[0] == null ? invalidResult : count[0];
}

function getTotalRunners(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(bibId) FROM StaEvents`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetTotalRunnersFromStaEvents: ${queryResult["COUNT(bibId)"]}`;
  console.log(message);

  return [queryResult["COUNT(bibId)"] as number, DatabaseStatus.Success, message];
}

function getRunnersInStation(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(*) FROM StaEvents WHERE timeOut IS NULL`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From StaEvents Where 'timeOut IS NULL':${queryResult["COUNT(*)"]}`;
  console.log(message);

  return [queryResult["COUNT(*)"] as number, DatabaseStatus.Success, message];
}

export function getRunnersOutStation(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(*) FROM StaEvents WHERE timeOut IS NOT NULL`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From StaEvents Where 'timeOut IS NOT NULL':${queryResult["COUNT(*)"]}`;
  console.log(message);

  return [queryResult["COUNT(*)"] as number, DatabaseStatus.Success, message];
}

function getRunnersWithDuplicateStatus(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(*) FROM StaEvents WHERE status == 1`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From StaEvents Where 'status == 1 (Duplicate)':${queryResult["COUNT(*)"]}`;
  console.log(message);

  return [queryResult["COUNT(*)"] as number, DatabaseStatus.Success, message];
}

export function readRunnersTable(): DatabaseResponse<RunnerDB[]> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM StaEvents`).all();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersTable from StaEvents: ${queryResult.length}`;
  console.log(message);

  queryResult.forEach((row: RunnerDB) => {
    row.timeIn = row.timeIn == null ? null : new Date(row.timeIn);
    row.timeOut = row.timeOut == null ? null : new Date(row.timeOut);
  });

  return [queryResult, DatabaseStatus.Success, message];
}

export async function importRunnersFromCSV() {
  const headers = ["index", "sent", "bibId", "timeIn", "timeOut", "note"];
  const runnerCSVFilePath = await loadRunnersFromCSV();
  const fileContent = fs.readFileSync(runnerCSVFilePath[0], { encoding: "utf-8" });
  const stationId = (await appSettings.get("station.id")) as number;

  parse(
    fileContent,
    {
      delimiter: ",",
      columns: headers,
      // eslint-disable-next-line camelcase
      from_line: 2
    },
    (error, result: RunnerCSV[]) => {
      if (error) {
        console.error(error);
        return `${result.length} timings: ${error}`;
      }

      console.log("Result", result);

      result.slice(1).forEach((timing) => {
        const record: RunnerDB = {
          index: timing.bibId,
          bibId: timing.bibId,
          stationId: stationId,
          timeIn: timing.timeIn == "" ? null : parseCSVDate(timing.timeIn),
          timeOut: timing.timeOut == "" ? null : parseCSVDate(timing.timeOut),
          timeModified: new Date(),
          note: timing.note.replaceAll(",", ""),
          sent: false,
          status: RecordStatus.OK
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

export function exportUnsentRunnersAsCSV() {
  const path = require("path");
  const db = getDatabaseConnection();
  const stationId = appSettings.getSync("station.id") as number;
  let fileIndex = appSettings.getSync("incrementalFileIndex") as number;
  let queryResult;

  const formattedStationId = stationId.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false
  });

  const formattedIndex = fileIndex.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false
  });

  const fileName: string = `Aid${formattedStationId}times_${formattedIndex}i.csv`;
  const filePath: string = path.join(AppPaths.userRoot, fileName);
  if (filePath == undefined) return "Invalid file name";

  try {
    queryResult = db.prepare(`SELECT * FROM StaEvents WHERE sent == 0`).all();

    if (queryResult.length == 0) {
      const previousIndex = fileIndex - 1;
      const formattedPreviousIndex = previousIndex.toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false
      });

      const previousFilename = `Aid${formattedStationId}times_${formattedPreviousIndex}i.csv`;
      return `No unsent records, previous file: ${previousFilename}`;
    }

    writeToCSV(filePath, queryResult, true);
    fileIndex++;
    appSettings.setSync("incrementalFileIndex", fileIndex);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return e.message;
    }
  }

  for (const key in queryResult) {
    markTimeRecordAsSent(queryResult[key].bibId);
  }

  return `Incremental file export successful: ${fileName}`;
}

export async function exportRunnersAsCSV() {
  const db = getDatabaseConnection();
  let queryResult;
  let filename: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM StaEvents`).all();
    filename = await saveRunnersToCSV();

    if (filename == undefined) return "Invalid file name";

    writeToCSV(filename, queryResult, false);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return e.message;
    }
  }
  return `File Export Successful: ${filename}`;
}

function writeToCSV(filename: string, queryResult, incremental: boolean) {
  const fs = require("fs");
  const eventName = appSettings.getSync("event.name") as string;
  const stationIdentifier = appSettings.getSync("station.identifier") as string;

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filename);
    let sequence = -1;

    // title row
    const event = eventName;
    const station = stationIdentifier;
    //const disclaimer = "All times are based off of the system they were recorded on.";
    const headerText = `${event},${station}`;
    stream.write(headerText + "\n");

    for (const row of queryResult as RunnerDB[]) {
      let rowText = "";
      const bSent = Boolean(row.sent);
      // header row
      // index,sent,bibId,timeIn,timeOut,note
      if (sequence == -1) {
        const rowText = `${row.index},${row.sent},${row.bibId},${row.timeIn},${row.timeOut},${row.note}`;
        stream.write(rowText + "\n");
        sequence++;
        continue;
      }

      if (!incremental || (incremental && !bSent)) {
        rowText =
          `${row.index},` +
          `${row.sent},` +
          `${row.bibId},` +
          `${row.timeIn == null ? "" : formatDate(new Date(row.timeIn))},` +
          `${row.timeOut == null ? "" : formatDate(new Date(row.timeOut))},` +
          `${row.note}`;
        stream.write(rowText + "\n");
      }
    }
    stream.on("error", reject);
    stream.end(resolve);
  });
}
