import fs from "fs";
import { finished } from "stream/promises";
import { parse } from "csv-parse";
import { getDatabaseConnection } from "./connect-db";
import { logEvent } from "./eventLogger-db";
import { clearAthletesTable, createAthletesTable } from "./tables-db";
import { AthleteStatus, DNFType, DatabaseStatus } from "../../shared/enums";
import { AthleteDB, DNFRecord, DNSRecord } from "../../shared/models";
import { DatabaseResponse } from "../../shared/types";
import { sendToastToRenderer } from "../ipc/toast-ipc";
import * as dialogs from "../lib/file-dialogs";
import { appStore } from "../lib/store";

const invalidResult = -999;

export async function LoadAthletes() {
  const headers = [
    "bibId",
    "firstName",
    "lastName",
    "gender",
    "age",
    "city",
    "state",
    "emergencyName",
    "emergencyPhone"
  ];

  // this is entirely destructive, will lose any notes and DNS/DNF tags that aren't saved to a file.
  clearAthletesTable();
  createAthletesTable();

  const athleteFilePath = await dialogs.loadAthleteFile();
  const fileContent = fs.createReadStream(athleteFilePath[0], { encoding: "utf-8" });
  const message: string[] = [];

  // TODO: Begin transaction
  const parser = fileContent
    .pipe(
      parse({
        delimiter: ",",
        columns: headers,
        fromLine: 2
      })
    )
    .on("data", (row) => {
      insertAthlete(row);
    })
    .on("error", (error) => {
      console.error(error.message);
      message.push(`Loading athletes: ${error.message}`);
      sendToastToRenderer({ message: error.message, type: "danger" });

      // This should be helpful according to https://nodejs.org/api/stream.html#streamfinishedstream-options
      // except it doesn't seem to be working, on("end") gets called sometimes, and might get the message out
      // return parser.end(message);
    })
    .on("end", () => {
      const { records } = parser.info;
      message.push(`${athleteFilePath}\r\n${records} athletes imported`);
    });
  // TODO: Commit transaction
  await finished(parser, { error: false });

  return message;
}

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
      updateAthleteDNSFromCSV(row);
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

  const parser = fileContent
    .pipe(
      parse({
        delimiter: ",",
        columns: headers,
        fromLine: 3
      })
    )
    .on("data", (row) => {
      updateAthleteDNFFromCSV(row);
    })
    .on("error", (error) => {
      console.error(error);
      message = `Loading dnfRecords: ${error.message}`;
      sendToastToRenderer({ message: error.message, type: "danger" });
    })
    .on("end", () => {
      const { records } = parser.info;
      message = `${dnfFilePath}\r\n${records} dnfRecords imported`;
    });
  await finished(parser);

  return message;
}

export function GetTotalAthletes(): number {
  const count = GetCountFromAthletes("bibId");
  return count[0] == null ? invalidResult : count[0];
}

export function GetTotalDNS(): number {
  const count = GetCountFromAthletesWithWhere("dns", `dns == 1`);
  return count[0] == null ? invalidResult : count[0];
}

export function GetTotalDNF(): number {
  const count = GetCountFromAthletesWithWhere("dnf", `dnf == ${Number(true)}`);
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

  const count = GetCountFromAthletesWithWhere("dnf", `dnfStation == '${stationIdentifier}'`);
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
    queryResult = db.prepare(`SELECT * FROM Athletes WHERE dnf == ?`).all(Number(true));
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return invalidResult;
    }
  }

  if (queryResult == null) return invalidResult;

  const dnfList = queryResult as AthleteDB[];
  const previousDNF: AthleteDB[] = [];

  for (const athlete of dnfList) {
    const id = Number(athlete.dnfStation?.split("-", 1)[0]);
    if (id < stationId) previousDNF.push(athlete);
  }

  return previousDNF.length == null ? invalidResult : previousDNF.length;
}

function GetCountFromAthletes(columnName: string): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT COUNT(${columnName}) FROM Athletes`).get();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `GetCountFromAthletesTable: ${queryResult[`COUNT(${columnName})`]}`;

  return [queryResult[`COUNT(${columnName})`] as number, DatabaseStatus.Success, message];
}

function GetCountFromAthletesWithWhere(
  columnName: string,
  whereStatement: string
): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db
      .prepare(`SELECT COUNT(${columnName}) FROM Athletes WHERE ${whereStatement}`)
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

export function GetAthletes(): DatabaseResponse<AthleteDB[]> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM Athletes`).all();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `table Read Athletes - records:${queryResult.length}`;
  console.log(message);
  return [queryResult as AthleteDB[], DatabaseStatus.Success, message];
}

export function GetAthleteByBib(bibNumber: number): [AthleteDB | null, DatabaseStatus, string] {
  return GetAthleteFromColumn("bibId", bibNumber);
}

export function GetAthleteFromColumn(
  columnName: string,
  value: unknown
): DatabaseResponse<AthleteDB> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM Athletes WHERE ${columnName} = ?`).get(value);
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
      `athletes: No athlete found with ${columnName}: ${value}`
    ];

  queryResult = queryResult as AthleteDB;

  // map result to athlete object
  const runner: AthleteDB = {
    index: queryResult.index,
    bibId: queryResult.bibId,
    firstName: queryResult.firstName,
    lastName: queryResult.lastName,
    gender: queryResult.gender,
    age: queryResult.age,
    city: queryResult.city,
    state: queryResult.state,
    emergencyPhone: queryResult.emergencyPhone,
    emergencyName: queryResult.emergencyName,
    dns: queryResult.dns,
    dnf: queryResult.dnf,
    dnfType: queryResult.dnfType,
    dnfStation: queryResult.dnfStation,
    dnfDateTime: queryResult.dnfDateTime,
    note: queryResult.note,
    status: queryResult.status
  };

  message = `athletes:Found athlete with bibId: ${runner.bibId}`;
  console.log(message);
  return [runner, DatabaseStatus.Success, message];
}

export function SetDNSOnAthlete(bibId: number, dnsValue: boolean): DatabaseResponse {
  const db = getDatabaseConnection();
  let message: string = "";

  try {
    const query = db.prepare(`UPDATE Athletes SET dns = ? WHERE bibId = ?`);
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

  message = `athlete:update bibId: ${bibId}, dns: ${dnsValue}`;
  return [DatabaseStatus.Updated, message];
}

export function SetDNFOnAthlete(
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
      `UPDATE Athletes SET dnf = ?, dnfType = ?, dnfStation = ?, dnfDateTime = ? WHERE bibId = ?`
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

  message = `athlete:update bibId: ${bibId}, dnf: ${dnfValue}, dnfType: ${dnfType}`;
  return [DatabaseStatus.Updated, message];
}

export function insertAthlete(athlete: AthleteDB): DatabaseResponse {
  const db = getDatabaseConnection();

  const bibId: number = athlete.bibId;
  const firstName: string = athlete.firstName;
  const lastName: string = athlete.lastName;
  const gender: string = athlete.gender;
  const age: number = athlete.age;
  const city: string = athlete.city;
  const state: string = athlete.state;
  const emergencyPhone: number = athlete.emergencyPhone;
  const emergencyName: string = athlete.emergencyName;
  const dns: number = Number(false);
  const dnf: number = Number(false);
  const dnfType = null;
  const dnfStation = null;
  const dnfDateTime = null;
  const note = null;
  const status = AthleteStatus.Incoming;

  try {
    const query = db.prepare(
      `INSERT INTO Athletes (bibId, firstName, lastName, gender, age, city, state, emergencyPhone, emergencyName, dns, dnf, dnfType, dnfStation, dnfDateTime, note, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    query.run(
      bibId,
      firstName,
      lastName,
      gender,
      age,
      city,
      state,
      emergencyPhone,
      emergencyName,
      dns,
      dnf,
      dnfType,
      dnfStation,
      dnfDateTime,
      note,
      status
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `athlete:add ${bibId}, ${firstName}, ${lastName}`;
  return [DatabaseStatus.Created, message];
}

export function updateAthleteDNSFromCSV(record: DNSRecord): DatabaseResponse {
  const db = getDatabaseConnection();
  const dnsValue = true;
  const verbose = false;

  try {
    const query = db.prepare(`UPDATE Athletes SET dns = ?, note = ? WHERE bibId = ?`);
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

export function updateAthleteDNFFromCSV(record: DNFRecord): DatabaseResponse {
  const db = getDatabaseConnection();
  const dnfValue = Number(true);
  const dnfDateTime = parseCSVDate(record.dnfDateTime).toISOString();
  const verbose = false;

  try {
    const query = db.prepare(
      `UPDATE Athletes SET dnf = ?, dnfType = ?, dnfStation = ?, dnfDateTime = ? WHERE bibId = ?`
    );
    query.run(dnfValue, record.dnfType, record.stationId, dnfDateTime, record.bibId);

    syncNoteWithAthlete(record.bibId, record.note, -1, SyncDirection.Outgoing);

    logEvent(
      record.bibId,
      record.stationId,
      null,
      dnfDateTime,
      dnfDateTime,
      `[Set](DNF): bibId: ${record.bibId} type: '${record.dnfType}' station: '${record.stationId}' note: '${record.note}'`,
      false,
      verbose
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `athlete:update bibId: ${record.bibId}, dnf: ${dnfValue}, dnfStation: ${record.stationId}, dnfDateTime: ${dnfDateTime}, note: ${record.note}`;
  return [DatabaseStatus.Updated, message];
}

function parseCSVDate(timingDate: string): Date {
  const event = new Date(Date.parse(timingDate));
  return event;
}

export function syncNoteWithAthlete(
  bibId: number,
  note: string,
  index: number,
  direction: SyncDirection
) {
  const db = getDatabaseConnection();
  const athleteResult = GetAthleteByBib(bibId);
  let combinedNote: string = "";

  if (athleteResult[1] != DatabaseStatus.Success) return;

  const athlete = athleteResult[0];
  const athleteNote = athlete?.note == undefined ? "" : athlete?.note;

  switch (direction) {
    case SyncDirection.Incoming:
      combinedNote = !note ? "" : note.replaceAll(",", "").trimStart();
      break;

    case SyncDirection.Outgoing:
      combinedNote = !note ? "" : note.replaceAll(",", "");
      combinedNote = !note ? "" : note.replaceAll(athleteNote, "");
      combinedNote = athleteNote.concat(" ", combinedNote).trimStart();
      break;
  }

  try {
    //trying to protect against settings notes across multiple records of the same bibId, e.g. many duplicates
    if (index != -1) {
      db.prepare(`UPDATE StationEvents SET note = ? WHERE "bibId" = ? and "index" = ?`).run(
        combinedNote,
        bibId,
        index
      );
    }
    db.prepare(`UPDATE Athletes SET note = ? WHERE "bibId" = ?`).run(combinedNote, bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `[sync][note](athlete<->timingRecord) bib:${bibId} note: ${combinedNote}`;
  return [DatabaseStatus.Updated, message];
}

export enum SyncDirection {
  Incoming,
  Outgoing
}

export function SetStatusOnAthlete(bibId: number): DatabaseResponse {
  const db = getDatabaseConnection();
  let message: string = "";
  let queryResult;
  let status;

  const query = `SELECT Athletes.*, StationEvents.timeIn, StationEvents.timeOut
       FROM "Athletes" LEFT JOIN "StationEvents"
       ON Athletes.bibId = StationEvents.bibId
       WHERE Athletes.bibId == ?`;

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
    status = AthleteStatus.Incoming;
  } else if (timeIn != null && timeOut == null) {
    status = AthleteStatus.Present;
  } else if (timeOut != null) {
    status = AthleteStatus.Outgoing;
  }

  try {
    const stmt = db.prepare(`UPDATE Athletes SET status = ? WHERE bibId = ?`);
    stmt.run(status, bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  message = `athlete:set status bibId: ${bibId}, status: ${AthleteStatus[status].toString()}`;
  return [DatabaseStatus.Updated, message];
}
