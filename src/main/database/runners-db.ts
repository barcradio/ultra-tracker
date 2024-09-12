import fs from "fs";
import { parse } from "csv-parse";
import appSettings from "electron-settings";
import { formatDate } from "$renderer/lib/datetimes";
import { DatabaseStatus, RecordStatus } from "$shared/enums";
import { RunnerAthleteDB, RunnerCSV, RunnerDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { getDatabaseConnection } from "./connect-db";
import { getColumnNamesFromTable } from "./tables-db";
import { insertOrUpdateTimeRecord, markTimeRecordAsSent } from "./timingRecords-db";
import * as dialogs from "../lib/file-dialogs";

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
    queryResult = db.prepare(`SELECT COUNT(bibId) FROM StationEvents`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetTotalRunnersFromStaEvents: ${queryResult["COUNT(bibId)"]}`;

  return [queryResult["COUNT(bibId)"] as number, DatabaseStatus.Success, message];
}

function getRunnersInStation(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(*) FROM StationEvents WHERE timeOut IS NULL`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From StationEvents Where 'timeOut IS NULL':${queryResult["COUNT(*)"]}`;

  return [queryResult["COUNT(*)"] as number, DatabaseStatus.Success, message];
}

export function getRunnersOutStation(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(*) FROM StationEvents WHERE timeOut IS NOT NULL`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From StationEvents Where 'timeOut IS NOT NULL':${queryResult["COUNT(*)"]}`;

  return [queryResult["COUNT(*)"] as number, DatabaseStatus.Success, message];
}

function getRunnersWithDuplicateStatus(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(*) FROM StationEvents WHERE status == 1`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From StationEvents Where 'status == 1 (Duplicate)':${queryResult["COUNT(*)"]}`;

  return [queryResult["COUNT(*)"] as number, DatabaseStatus.Success, message];
}

function getRunnersNotSent(): DatabaseResponse<RunnerDB> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM StationEvents WHERE sent == 0`).all();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersNotSent Succeeded`;
  return [queryResult, DatabaseStatus.Success, message];
}

export function readRunnersTable<T>(
  includeDNF: T
): T extends true ? DatabaseResponse<RunnerAthleteDB[]> : DatabaseResponse<RunnerDB[]> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  const statement = includeDNF
    ? `SELECT StationEvents.*, Athletes.dnf, Athletes.dnfType
       FROM "StationEvents" LEFT JOIN "Athletes"
       ON StationEvents.bibId = Athletes.bibId`
    : `SELECT * FROM StationEvents`;

  try {
    queryResult = db.prepare(statement).all();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersTable from StationEvents: ${queryResult.length}`;

  queryResult.forEach((row: RunnerDB) => {
    row.timeIn = row.timeIn == null ? null : new Date(row.timeIn);
    row.timeOut = row.timeOut == null ? null : new Date(row.timeOut);
  });

  return [queryResult, DatabaseStatus.Success, message];
}

export async function importRunnersFromCSV() {
  const headers = ["index", "sent", "bibId", "timeIn", "timeOut", "note"];
  const runnerCSVFilePath = await dialogs.loadRunnersFromCSV();
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
          note: !timing.note ? "" : timing.note.replaceAll(",", ""),
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
  const filePath: string = path.join(dialogs.AppPaths.userRoot, fileName);
  if (filePath == undefined) return "Invalid file name";

  try {
    queryResult = getRunnersNotSent()[0];
    if (queryResult == null) return `Failed to get unsent runners`;

    if (queryResult.length == 0) {
      const previousIndex = fileIndex - 1;
      const formattedPreviousIndex = previousIndex.toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false
      });

      const previousFilename = `Aid${formattedStationId}times_${formattedPreviousIndex}i.csv`;
      return `No unsent records, previous file: ${previousFilename}`;
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return e.message;
    }
  }

  try {
    for (const key in queryResult) {
      markTimeRecordAsSent(queryResult[key].bibId, true); //set flag before export
    }

    writeToCSV(filePath, queryResult, true);
    fileIndex++;
    appSettings.setSync("incrementalFileIndex", fileIndex);
  } catch (e) {
    if (e instanceof Error) {
      for (const key in queryResult) {
        markTimeRecordAsSent(queryResult[key].bibId, false); //reset flag if failed
      }
      console.error(e.message);
      return e.message;
    }
  }

  return `Incremental file export successful: ${fileName}`;
}

export async function exportRunnersAsCSV() {
  const db = getDatabaseConnection();
  let queryResult;
  let filename: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM StationEvents`).all();
    filename = await dialogs.saveRunnersToCSV();

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

export async function exportDNSAsCSV() {
  const db = getDatabaseConnection();
  let queryResult;
  let filename: string = "";

  const stmt = `SELECT * FROM Athletes WHERE dns == 1`;

  try {
    queryResult = db.prepare(stmt).all();
    filename = await dialogs.saveDNSRunnersToCSV();

    if (filename == undefined) return "Invalid file name";

    writeDNSToCSV(filename, queryResult);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return e.message;
    }
  }
  return `File Export Successful: ${filename}`;
}

export async function exportDNFAsCSV() {
  const db = getDatabaseConnection();
  let queryResult;
  let filename: string = "";
  const stationIdentifier = appSettings.getSync("station.identifier") as number;

  const stmt = `
    SELECT t1.dnf, t1.dnfType, t1.dnfStation, t1.dnfDateTime, t2.*
    FROM Athletes t1 INNER JOIN StationEvents t2
    ON t2.bibId IN (t1.bibId, t1.dnf, t1.dnfStation)
    WHERE t1.bibId = t2.bibId
    AND t1.dnf == 1
    AND t1.dnfStation == ?
  `;

  try {
    queryResult = db.prepare(stmt).all(stationIdentifier);
    filename = await dialogs.saveDNFRunnersToCSV();

    if (filename == undefined) return "Invalid file name";

    writeDNFToCSV(filename, queryResult);
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

    // title row
    //const disclaimer = "All times are based off of the system they were recorded on.";
    const headerText = `${eventName},${stationIdentifier}`;
    stream.write(headerText + "\n");

    // header row
    // index,sent,bibId,timeIn,timeOut,note
    const columnNames = getColumnNamesFromTable("StationEvents");
    const rowText = `${columnNames[0]},${columnNames[7]},${columnNames[1]},${columnNames[3]},${columnNames[4]},${columnNames[6]}`;
    stream.write(rowText + "\n");

    for (const row of queryResult as RunnerDB[]) {
      let rowText = "";
      const bSent = Boolean(row.sent);
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

interface DNFRunnerDB extends RunnerDB {
  dnf: number;
  dnfType: string;
  dnfStation: string;
  dnfDateTime: string;
}

function writeDNSToCSV(filename: string, queryResult) {
  const fs = require("fs");
  const eventName = appSettings.getSync("event.name") as string;
  const eventStartTime = appSettings.getSync("event.starttime") as string;
  const stationIdentifier = appSettings.getSync("station.identifier") as string;
  const startLineIdentifier = appSettings.getSync("event.startline") as string;

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filename);

    // title row
    const headerText = `${eventName},${stationIdentifier}`;
    stream.write(headerText + "\n");

    // header row
    // stationId,bibId,dnsDateTime,note
    const columnNames = ["stationId", "bibId", "dnsDateTime", "note"];
    const rowText = `${columnNames[0]},${columnNames[1]},${columnNames[2]},${columnNames[3]}`;
    stream.write(rowText + "\n");

    for (const row of queryResult as RunnerDB[]) {
      let rowText = "";
      rowText =
        `${startLineIdentifier},` +
        `${row.bibId},` +
        `${eventStartTime == null ? "" : formatDate(new Date(eventStartTime))},` +
        `${row.note}`;
      stream.write(rowText + "\n");
    }
    stream.on("error", reject);
    stream.end(resolve);
  });
}

function writeDNFToCSV(filename: string, queryResult) {
  const fs = require("fs");
  const eventName = appSettings.getSync("event.name") as string;
  const stationIdentifier = appSettings.getSync("station.identifier") as string;

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filename);

    // title row
    const headerText = `${eventName},${stationIdentifier}`;
    stream.write(headerText + "\n");

    // header row
    // stationId,bibId,dnfType,dnfDateTime,note
    const columnNames = ["stationId", "bibId", "dnfType", "dnfDateTime", "note"];
    const rowText = `${columnNames[0]},${columnNames[1]},${columnNames[2]},${columnNames[3]},${columnNames[4]}`;
    stream.write(rowText + "\n");

    for (const row of queryResult as DNFRunnerDB[]) {
      let rowText = "";
      rowText =
        `${row.dnfStation},` +
        `${row.bibId},` +
        `${row.dnfType},` +
        `${row.dnfDateTime == null ? "" : formatDate(new Date(row.dnfDateTime))},` +
        `${row.note}`;
      stream.write(rowText + "\n");
    }
    stream.on("error", reject);
    stream.end(resolve);
  });
}
