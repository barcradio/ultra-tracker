import fs from "fs";
import { finished } from "stream/promises";
import { parse } from "csv-parse";
import { getDatabaseConnection } from "./connect-db";
import { AthleteProgress, DNFType, DatabaseStatus } from "../../shared/enums";
import { DNFRecord, DNSRecord, StatusDB } from "../../shared/models";
import { logEvent } from "./eventLogger-db";
import { DatabaseResponse } from "../../shared/types";
import { sendToastToRenderer } from "../ipc/toast-ipc";
import * as dialogs from "../lib/file-dialogs";
import { appStore } from "../lib/store";

const invalidResult = -999;

export async function LoadDNS() {
  const headers = ["stationId", "bibId", "dnsDateTime", "note"];
  const dnsFilePath = await dialogs.loadDNSFromCSV();
  const fileContent = fs.createReadStream(dnsFilePath[0], { encoding: "utf-8" });
  let message: string = "";

  const parser = fileContent
    .pipe(
      parse({
        delimiter: ",",
        columns: headers,
        fromLine: 3
      })
    )
    .on("data", (row) => {
      updateDNSFromCSV(row);
    })
    .on("error", (error) => {
      console.error(error);
      message = `Loading dnsRecords: ${error.message}`;
      sendToastToRenderer({ message: error.message, type: "danger" });
    })
    .on("end", () => {
      const { records } = parser.info;
      message = `${dnsFilePath}\r\n${records} dnsRecords imported`;
    });
  await finished(parser);

  return message;
}

export async function LoadDNF() {
  const headers = ["stationId", "bibId", "dnfType", "dnfDateTime", "note"];
  const dnfFilePath = await dialogs.loadDNFFromCSV();
  const fileContent = fs.createReadStream(dnfFilePath[0], { encoding: "utf-8" });
  let message: string = "";
  let dnfCount: number = 0;

  const parser = fileContent
    .pipe(
      parse({
        delimiter: ",",
        columns: headers,
        fromLine: 3
      })
    )
    .on("data", (row) => {
      // load dnf into current station only if from earlier or current
      var dnfStationId = Number(row.stationId.split("-", 1)[0]);
      const stationId = appStore.get("station.id") as number;

      if (dnfStationId <= stationId) {
        updateDNFFromCSV(row);
        dnfCount++;
      }
    })
    .on("error", (error) => {
      console.error(error);
      message = `Loading dnfRecords: ${error.message}`;
      sendToastToRenderer({ message: error.message, type: "danger" });
    })
    .on("end", () => {
      const { records } = parser.info;
      message = `${dnfFilePath}\r\n${records} dnfRecords processed, ${dnfCount} imported`;
    });
  await finished(parser);

  return message;
}

export function GetStatusByBib(bibNumber: number): [StatusDB | null, DatabaseStatus, string] {
  return GetStatusFromColumn("bibId", bibNumber);
}

export function GetStatusFromColumn(
  columnName: string,
  value: unknown
): DatabaseResponse<StatusDB> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM Status WHERE ${columnName} = ?`).get(value);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null)
    return [
      null,
      DatabaseStatus.NotFound,
      `athletes: No status found with ${columnName}: ${value}`
    ];

  queryResult = queryResult as StatusDB;

  // map result to athlete object
  const athleteStatus: StatusDB = {
    bibId: queryResult.bibId,
    dns: queryResult.dns,
    dnf: queryResult.dnf,
    dnfType: queryResult.dnfType,
    dnfStation: queryResult.dnfStation,
    dnfDateTime: queryResult.dnfDateTime,
    note: queryResult.note,
    progress: queryResult.progress
  };

  message = `athletes:Found status with bibId: ${athleteStatus.bibId}`;
  console.log(message);
  return [athleteStatus, DatabaseStatus.Success, message];
}

export function GetTotalDNS(): number {
  const count = GetStatusCount("dns", `dns == 1`);
  return count[0] == null ? invalidResult : count[0];
}

export function GetTotalDNF(): number {
  const count = GetStatusCount("dnf", `dnf == ${Number(true)}`);
  return count[0] == null ? invalidResult : count[0];
}

export function GetStationDNF(): number {
  let stationIdentifier: string | null = null;
  try {
    stationIdentifier = appStore.get("station.identifier") as string;
  } catch (e) {
    if (e instanceof Error) return invalidResult;
  }

  if (!stationIdentifier) return invalidResult;

  const count = GetStatusCount("dnf", `dnfStation == '${stationIdentifier}'`);
  return count[0] == null ? invalidResult : count[0];
}

export function GetPreviousDNF(): number {
  const db = getDatabaseConnection();
  let stationId: number | null = null;

  try {
    stationId = appStore.get("station.id") as number;
  } catch (e) {
    if (e instanceof Error) return invalidResult;
  }

  if (stationId == null) return invalidResult;

  let queryResult;

  try {
    queryResult = db.prepare(`SELECT * FROM Status WHERE dnf == ?`).all(Number(true));
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return invalidResult;
    }
  }

  if (queryResult == null) return invalidResult;

  const dnfList = queryResult as StatusDB[];
  const previousDNF: StatusDB[] = [];

  for (const record of dnfList) {
    const id = Number(record.dnfStation?.split("-", 1)[0]);
    if (id < stationId) previousDNF.push(record);
  }

  return previousDNF.length == null ? invalidResult : previousDNF.length;
}

export function SetDNS(bibId: number, dnsValue: boolean): DatabaseResponse {
  const db = getDatabaseConnection();
  let message: string = "";

  try {
    const query = db.prepare(`UPDATE Status SET dns = ? WHERE bibId = ?`);
    query.run(Number(dnsValue), bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  logEvent(
    bibId,
    null,
    null,
    null,
    new Date().toISOString(),
    `[Set](DNS): bib:${bibId}, value:${dnsValue}`,
    false,
    false
  );

  message = `status:update bibId: ${bibId}, dns: ${dnsValue}`;
  return [DatabaseStatus.Updated, message];
}

function GetStatusCount(columnName: string, whereStatement: string): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db
      .prepare(`SELECT COUNT(${columnName}) FROM Status WHERE ${whereStatement}`)
      .get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetCountFromAthletes Where '${whereStatement}':${queryResult[`COUNT(${columnName})`]}`;

  return [queryResult[`COUNT(${columnName})`] as number, DatabaseStatus.Success, message];
}

export function SetDNF(
  bibId: number,
  timeOut: Date | null,
  dnfValue: boolean,
  dnfType: DNFType
): DatabaseResponse {
  const db = getDatabaseConnection();
  let message: string = "";
  let stationIdentifier: string | null = appStore.get("station.identifier") as string;
  let dnf: DNFType | null = dnfType;
  const dnfDateTime = !timeOut ? new Date().toISOString() : timeOut.toISOString();

  if (!dnfValue) {
    stationIdentifier = null;
    dnf = null;
  }

  try {
    const query = db.prepare(
      `UPDATE Status SET dnf = ?, dnfType = ?, dnfStation = ?, dnfDateTime = ? WHERE bibId = ?`
    );
    query.run(Number(dnfValue), dnf, stationIdentifier, dnfDateTime, bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  logEvent(
    bibId,
    null,
    null,
    null,
    dnfDateTime,
    `[Set](DNF): bib:${bibId}, value:${dnfValue}`,
    false,
    false
  );

  message = `status:update bibId: ${bibId}, dnf: ${dnfValue}, dnfType: ${dnfType}`;
  return [DatabaseStatus.Updated, message];
}

export function updateDNSFromCSV(record: DNSRecord): DatabaseResponse {
  const db = getDatabaseConnection();
  const dnsValue = true;
  const verbose = false;

  try {
    const query = db.prepare(`UPDATE Status SET dns = ?, note = ? WHERE bibId = ?`);
    query.run(Number(dnsValue), record.note.replaceAll(",", ""), record.bibId);

    const dnsDateTime = parseCSVDate(record.dnsDateTime).toISOString();

    logEvent(
      record.bibId,
      record.stationId,
      null,
      null,
      dnsDateTime,
      `[Set](DNS): bibId:${record.bibId} station:'${record.stationId}'`,
      false,
      verbose
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `athlete:update bibId: ${record.bibId}, dns: ${dnsValue}, note: ${record.note}`;
  return [DatabaseStatus.Updated, message];
}

export function updateDNFFromCSV(record: DNFRecord): DatabaseResponse {
  const db = getDatabaseConnection();
  const dnfValue = Number(true);
  const dnfDateTime = parseCSVDate(record.dnfDateTime).toISOString();
  const verbose = false;

  try {
    const query = db.prepare(
      `UPDATE Status SET dnf = ?, dnfType = ?, dnfStation = ?, dnfDateTime = ? WHERE bibId = ?`
    );
    query.run(dnfValue, record.dnfType, record.stationIdentifier, dnfDateTime, record.bibId);

    syncNoteWithStatus(record.bibId, record.note, -1, SyncDirection.Outgoing);

    logEvent(
      record.bibId,
      record.stationIdentifier,
      null,
      dnfDateTime,
      dnfDateTime,
      `[Set](DNF): bibId: ${record.bibId} type: '${record.dnfType}' station: '${record.stationIdentifier}' note: '${record.note}'`,
      false,
      verbose
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `athlete:update bibId: ${record.bibId}, dnf: ${dnfValue}, dnfStation: ${record.stationIdentifier}, dnfDateTime: ${dnfDateTime}, note: ${record.note}`;
  return [DatabaseStatus.Updated, message];
}

function parseCSVDate(timingDate: string): Date {
  const event = new Date(Date.parse(timingDate));
  return event;
}

// TODO: refactor to always get status from its table
export function syncNoteWithStatus(
  bibId: number,
  note: string,
  index: number,
  direction: SyncDirection
) {
  const db = getDatabaseConnection();
  const statusResult = GetStatusByBib(bibId);
  let combinedNote: string = "";

  if (statusResult[1] != DatabaseStatus.Success) return;

  const status = statusResult[0];
  const statusNote = status?.note == undefined ? "" : status?.note;

  switch (direction) {
    case SyncDirection.Incoming:
      combinedNote = !note ? "" : note.replaceAll(",", "").trimStart();
      break;

    case SyncDirection.Outgoing:
      combinedNote = !note ? "" : note.replaceAll(",", "");
      combinedNote = !note ? "" : note.replaceAll(statusNote, "");
      combinedNote = statusNote.concat(" ", combinedNote).trimStart();
      break;
  }

  try {
    //trying to protect against settings notes across multiple records of the same bibId, e.g. many duplicates
    if (index != -1) {
      db.prepare(`UPDATE TimeRecords SET note = ? WHERE "bibId" = ? and "index" = ?`).run(
        combinedNote,
        bibId,
        index
      );
    }
    db.prepare(`UPDATE Status SET note = ? WHERE "bibId" = ?`).run(combinedNote, bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `[sync][note](status<->timingRecord) bib:${bibId} note: ${combinedNote}`;
  return [DatabaseStatus.Updated, message];
}

export enum SyncDirection {
  Incoming,
  Outgoing
}

export function SetProgress(bibId: number): DatabaseResponse {
  const db = getDatabaseConnection();
  let message: string = "";
  let queryResult;
  let status;

  const query = `SELECT Status.*, TimeRecords.timeIn, TimeRecords.timeOut
       FROM "Status" LEFT JOIN "TimeRecords"
       ON Status.bibId = TimeRecords.bibId
       WHERE Status.bibId == ?`;

  try {
    queryResult = db.prepare(query).get(bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [DatabaseStatus.NotFound, message];

  const timeIn = queryResult.timeIn! == undefined ? null : queryResult.timeIn;
  const timeOut = queryResult.timeOut! == undefined ? null : queryResult.timeOut;

  if (timeIn == null && timeOut == null) {
    status = AthleteProgress.Incoming;
  } else if (timeIn != null && timeOut == null) {
    status = AthleteProgress.Present;
  } else if (timeOut != null) {
    status = AthleteProgress.Outgoing;
  }

  try {
    const stmt = db.prepare(`UPDATE Status SET progress = ? WHERE bibId = ?`);
    stmt.run(status, bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  message = `Status:set Progress bibId: ${bibId}, value: ${AthleteProgress[status].toString()}`;
  return [DatabaseStatus.Updated, message];
}

export function initStatus(bibId: number) {
  const status: StatusDB = {
    bibId: bibId,
    dns: false,
    dnf: false,
    dnfType: undefined,
    dnfStation: undefined,
    dnfDateTime: null,
    note: undefined,
    progress: AthleteProgress.Incoming
  };

  insertStatus(status);
}

export function insertStatus(status: StatusDB): DatabaseResponse {
  const db = getDatabaseConnection();
  const bibId: number = status.bibId;
  const dns: number = Number(status.dns);
  const dnf: number = Number(status.dnf);
  const dnfType = status.dnfType;
  const dnfStation = status.dnfStation;
  const dnfDateTime = status.dnfDateTime;
  const note = status.note;
  const progress = status.progress;

  const statusRecord = GetStatusByBib(bibId);
  if (statusRecord[0] != null) {
    const message = `status:duplicate ${bibId}, ${dns}, ${dnf}, '${note}', ${progress}`;
    return [DatabaseStatus.Duplicate, message];
  }

  try {
    const query = db.prepare(
      `INSERT INTO Status (bibId, dns, dnf, dnfType, dnfStation, dnfDateTime, note, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    query.run(bibId, dns, dnf, dnfType, dnfStation, dnfDateTime, note, progress);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `status:add ${bibId}, ${dns}, ${dnf}, '${note}', ${progress}`;
  return [DatabaseStatus.Created, message];
}
