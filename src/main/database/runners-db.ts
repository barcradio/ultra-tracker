import fs from "fs";
import { finished } from "stream/promises";
import { parse } from "csv-parse";
import { format } from "date-fns";
import { DNFType, DatabaseStatus, RecordStatus } from "$shared/enums";
import { RunnerAthleteDB, RunnerDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import { SetDNF } from "./status-db";
import { getDatabaseConnection } from "./connect-db";
import { insertOrUpdateTimeRecord, markTimeRecordAsSent } from "./timingRecords-db";
import { sendToastToRenderer } from "../ipc/toast-ipc";
import * as dialogs from "../lib/file-dialogs";
import { appStore } from "../lib/store";

export function formatDate(date: Date | null): string {
  if (date == null) return "";

  return format(date, "HH:mm:ss dd LLL yyyy");
}

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

export function GetDNSRunnersInStation(): number {
  const count = getDNSRunnersInStation();
  return count[0] == null ? invalidResult : count[0];
}

export function GetUnknownRunners(): number {
  const count = getUnknownRunners();
  return count[0] == null ? invalidResult : count[0];
}

function getTotalRunners(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(bibId) FROM TimeRecords`).get();
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
    queryResult = db.prepare(`SELECT COUNT(*) FROM TimeRecords WHERE timeOut IS NULL`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From TimeRecords Where 'timeOut IS NULL':${queryResult["COUNT(*)"]}`;

  return [queryResult["COUNT(*)"] as number, DatabaseStatus.Success, message];
}

export function getRunnersOutStation(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(*) FROM TimeRecords WHERE timeOut IS NOT NULL`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From TimeRecords Where 'timeOut IS NOT NULL':${queryResult["COUNT(*)"]}`;

  return [queryResult["COUNT(*)"] as number, DatabaseStatus.Success, message];
}

function getRunnersWithDuplicateStatus(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(*) FROM TimeRecords WHERE status == 1`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From TimeRecords Where 'status == 1 (Duplicate)':${queryResult["COUNT(*)"]}`;

  return [queryResult["COUNT(*)"] as number, DatabaseStatus.Success, message];
}

function getUnknownRunners(): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let message: string = "";
  let queryResult;

  const stmt = `SELECT *
                FROM TimeRecords 
                WHERE bibId NOT IN (SELECT bibId FROM Athletes)`;

  try {
    queryResult = db.prepare(stmt).all();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetUnknownRunners in Athletes':${queryResult.length}`;

  return [queryResult.length as number, DatabaseStatus.Success, message];
}

function getDNSRunnersInStation(): DatabaseResponse<number> {
  let stationId = -1;
  try {
    stationId = appStore.get("station.id") as number;
  } catch (e) {
    if (e instanceof Error) {
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  const db = getDatabaseConnection();
  let message: string = "";
  let queryResult;

  const stmt = `SELECT TimeRecords.*, Status.dnf, Status.dnfType, Status.dns
       FROM "TimeRecords" LEFT JOIN "Status"
       ON TimeRecords.bibId = Status.bibId
       WHERE Status.dns == 1 and TimeRecords.stationId == ?`;
  try {
    queryResult = db.prepare(stmt).all(stationId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersInStation From TimeRecords Where 'Status.dns == 1 and TimeRecords.stationId == ${stationId}':${queryResult.length}`;

  return [queryResult.length as number, DatabaseStatus.Success, message];
}

function getRunnersWithDNFNotSent(): DatabaseResponse<DNFRunnerDB> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db
      .prepare(
        `SELECT TimeRecords.*, Status.dnf, Status.dnfType, Status.dnfStation, Status.dnfDateTime, Status.dns
        FROM "TimeRecords" LEFT JOIN "Status"
        ON TimeRecords.bibId = Status.bibId WHERE sent == 0`
      )
      .all();
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
    ? `SELECT TimeRecords.*, Status.dnf, Status.dnfType, Status.dns
       FROM "TimeRecords" LEFT JOIN "Status"
       ON TimeRecords.bibId = Status.bibId`
    : `SELECT * FROM TimeRecords`;

  try {
    queryResult = db.prepare(statement).all();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetRunnersTable from TimeRecords: ${queryResult.length}`;

  queryResult.forEach((row: RunnerDB) => {
    row.timeIn = row.timeIn == null ? null : new Date(row.timeIn);
    row.timeOut = row.timeOut == null ? null : new Date(row.timeOut);
  });

  return [queryResult, DatabaseStatus.Success, message];
}

export async function importRunnersFromCSV() {
  const headers = ["index", "sent", "bibId", "timeIn", "timeOut", "dnfType", "dnfStation", "note"];
  const runnerCSVFilePath = await dialogs.loadRunnersFromCSV();
  const fileContent = fs.createReadStream(runnerCSVFilePath[0], { encoding: "utf-8" });
  const stationId = (await appStore.get("station.id")) as number;
  let message: string = "";

  const parser = fileContent
    .pipe(
      parse({
        delimiter: ",",
        columns: headers,
        fromLine: 3
      })
    )
    .on("data", (timing) => {
      const record: DNFRunnerDB = {
        index: timing.bibId,
        bibId: Number(timing.bibId) - Number(timing.bibId % 1),
        stationId: stationId,
        timeIn: timing.timeIn == "" ? null : parseCSVDate(timing.timeIn),
        timeOut: timing.timeOut == "" ? null : parseCSVDate(timing.timeOut),
        timeModified: new Date(),
        note: !timing.note ? "" : timing.note.replaceAll(",", ""),
        sent: false,
        status: timing.bibId % 1 == 0 ? RecordStatus.OK : RecordStatus.Duplicate,
        dnf: Number(timing.dnfType != ""),
        dnfType: timing.dnfType,
        dnfStation: timing.dnfStation,
        dnfDateTime: timing.timeOut == "" ? null : parseCSVDate(timing.timeOut)
      };

      function enumFromStringValue<T>(enm: { [s: string]: T }, value: string): T | undefined {
        return (Object.values(enm) as unknown as string[]).includes(value)
          ? (value as unknown as T)
          : undefined;
      }

      insertOrUpdateTimeRecord(record);
      if (record.dnf) {
        const dnfType = enumFromStringValue(DNFType, record.dnfType);
        SetDNF(record.bibId, record.timeOut, Boolean(record.dnf), dnfType!);
      }
    })
    .on("error", (error) => {
      console.error(error);
      message = `Loading dnfRecords: ${error.message}`;
      sendToastToRenderer({ message: error.message, type: "danger" });
    });
  await finished(parser);

  return message;
}

function parseCSVDate(timingDate: string): Date {
  const event = new Date(Date.parse(timingDate));
  return event;
}

export function exportUnsentRunnersAsCSV() {
  let queryResult;
  const path = require("path");
  const stationId = appStore.get("station.id") as number;
  let fileIndex = appStore.get("incrementalFileIndex") as number;

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
    queryResult = getRunnersWithDNFNotSent()[0];
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
    appStore.set("incrementalFileIndex", fileIndex);
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
    queryResult = db
      .prepare(
        `SELECT TimeRecords.*, Status.dnf, Status.dnfType, Status.dnfStation, Status.dnfDateTime, Status.dns
        FROM "TimeRecords" LEFT JOIN "Status"
        ON TimeRecords.bibId = Status.bibId`
      )
      .all();
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

  const stmt = `SELECT * FROM Status WHERE dns == 1`;

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
  const stationIdentifier = appStore.get("station.identifier") as number;

  const stmt = `
    SELECT t1.dnf, t1.dnfType, t1.dnfStation, t1.dnfDateTime, t2.*
    FROM Status t1 INNER JOIN TimeRecords t2
    ON t1.bibId = t2.bibId
    WHERE t1.dnf == 1
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
  const eventName = appStore.get("event.name") as string;
  const stationIdentifier = appStore.get("station.identifier") as string;

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filename);
    const exportType = incremental ? "incremental-export" : "full-export";
    // title row
    const titleText = `${eventName},${stationIdentifier},${exportType}`;
    stream.write(titleText + "\n");

    // header row
    const headerText = `index,sent,bibId,timeIn,timeOut,dnfType,dnfStation,note`;
    stream.write(headerText + "\n");

    for (const row of queryResult as DNFRunnerDB[]) {
      let rowText = "";
      const bSent = Boolean(row.sent);
      if (!incremental || (incremental && !bSent)) {
        row.sent = true;
        rowText =
          `${row.index},` +
          `${Number(row.sent)},` +
          `${row.bibId},` +
          `${row.timeIn == null ? "" : formatDate(new Date(row.timeIn))},` +
          `${row.timeOut == null ? "" : formatDate(new Date(row.timeOut))},` +
          `${row.dnfType == null ? "" : row.dnfType},` +
          `${row.dnfStation == null ? "" : row.dnfStation},` +
          `${row.note == null ? "" : row.note}`;
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
  dnfDateTime: Date | null;
}

function writeDNSToCSV(filename: string, queryResult) {
  const fs = require("fs");
  const eventName = appStore.get("event.name") as string;
  const eventStartTime = appStore.get("event.starttime") as string;
  const stationIdentifier = appStore.get("station.identifier") as string;
  const startLineIdentifier = appStore.get("event.startline") as string;

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filename);

    // title row
    const headerText = `${eventName},${stationIdentifier},dns-export`;
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
        `${eventStartTime == null ? "" : eventStartTime},` +
        `${row.note}`;
      stream.write(rowText + "\n");
    }
    stream.on("error", reject);
    stream.end(resolve);
  });
}

function writeDNFToCSV(filename: string, queryResult) {
  const fs = require("fs");
  const eventName = appStore.get("event.name") as string;
  const stationIdentifier = appStore.get("station.identifier") as string;

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filename);

    // title row
    const headerText = `${eventName},${stationIdentifier},dnf-export`;
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
        `${row.dnfDateTime == null ? "" : formatDate(row.dnfDateTime)},` +
        `${row.note}`;
      stream.write(rowText + "\n");
    }
    stream.on("error", reject);
    stream.end(resolve);
  });
}
