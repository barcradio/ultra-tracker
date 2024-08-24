import fs from "fs";
import { parse } from "csv-parse";
import { getDatabaseConnection } from "./connect-db";
import { data } from "../../preload/data";
import { AthleteDB, DNXRecord, DatabaseStatus } from "../../shared/models";
import { loadAthleteFile, loadDNFFromCSV, loadDNSFromCSV } from "../lib/file-dialogs";

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
  const athleteFilePath = await loadAthleteFile();
  const fileContent = fs.readFileSync(athleteFilePath[0], { encoding: "utf-8" });

  parse(
    fileContent,
    {
      delimiter: ",",
      columns: headers
    },
    (error, result: AthleteDB[]) => {
      if (error) {
        console.error(error);
        return `${result.length} athletes: ${error}`;
      }

      console.log("Result", result);

      result.slice(1).forEach((athlete) => {
        insertAthlete(athlete);
      });
      return `${athleteFilePath}\r\n${result.length} athletes imported`;
    }
  );
}

export async function LoadDNS() {
  const headers = ["stationId", "bibId", "dnsDateTime", "note"];
  const athleteFilePath = await loadDNSFromCSV();
  const fileContent = fs.readFileSync(athleteFilePath[0], { encoding: "utf-8" });

  parse(
    fileContent,
    {
      delimiter: ",",
      columns: headers
    },
    (error, result: DNXRecord[]) => {
      if (error) {
        console.error(error);
        return `${result.length} dnsRecords: ${error}`;
      }

      console.log("Result", result);

      result.slice(1).forEach((dnsRecord) => {
        updateAthleteDNS(dnsRecord);
      });
      return `${athleteFilePath}\r\n${result.length} dnsRecords imported`;
    }
  );
}

export async function LoadDNF() {
  const headers = ["stationId", "bibId", "dnfDateTime", "note"];
  const athleteFilePath = await loadDNFFromCSV();
  const fileContent = fs.readFileSync(athleteFilePath[0], { encoding: "utf-8" });

  parse(
    fileContent,
    {
      delimiter: ",",
      columns: headers
    },
    (error, result: DNXRecord[]) => {
      if (error) {
        console.error(error);
        return `${result.length} dnfRecords: ${error}`;
      }

      //if (JSON.stringify(result[0]) != JSON.stringify(headers))
      //  return `${result.length} dnfRecords: ${error}`;

      console.log("Result", result);

      result.slice(1).forEach((dnfRecord) => {
        updateAthleteDNF(dnfRecord);
      });
      return `${athleteFilePath}\r\n${result.length} dnfRecords imported`;
    }
  );
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
  const count = GetCountFromAthletesWithWhere("dnf", `dnf == 1`);
  return count[0] == null ? invalidResult : count[0];
}

export function GetStationDNF(): number {
  const count = GetCountFromAthletesWithWhere("dnf", `dnfStation == '${data.station.name}'`);
  return count[0] == null ? invalidResult : count[0];
}

function GetCountFromAthletes(columnName: string): [number | null, DatabaseStatus, string] {
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
  console.log(message);

  return [queryResult[`COUNT(${columnName})`] as number, DatabaseStatus.Success, message];
}

function GetCountFromAthletesWithWhere(
  columnName: string,
  whereStatement: string
): [number | null, DatabaseStatus, string] {
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
  console.log(message);

  return [queryResult[`COUNT(${columnName})`] as number, DatabaseStatus.Success, message];
}

export function GetAthletes(): [AthleteDB[] | null, DatabaseStatus, string] {
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
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM Athletes WHERE bibId = ?`).get(bibNumber);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

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
    dns: false,
    dnf: false,
    dnfStation: 0,
    dnfDateTime: null
  };

  message = `athletes:Found athlete with bibId: ${runner.bibId}`;
  console.log(message);
  return [runner, DatabaseStatus.Success, message];
}

export function insertAthlete(athlete: AthleteDB): [DatabaseStatus, string] {
  const db = getDatabaseConnection();

  const bibId: number = athlete.bibId;
  const firstName: string = athlete.firstName;
  const lastName: string = athlete.lastName;
  const gender: string = athlete.gender;
  const age: number = athlete.age;
  const city: string = athlete.city;
  const state: string = athlete.state;
  const emergencyPhone: string = athlete.emergencyPhone;
  const emergencyName: string = athlete.emergencyName;
  const dns: number = Number(false);
  const dnf: number = Number(false);
  const dnfStation = -1;
  const dnfDateTime = null;

  try {
    const query = db.prepare(
      `INSERT INTO Athletes (bibId, firstName, lastName, gender, age, city, state, emergencyPhone, emergencyName, dns, dnf, dnfStation, dnfDateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      dnfStation,
      dnfDateTime
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

export function updateAthleteDNS(record: DNXRecord): [DatabaseStatus, string] {
  const db = getDatabaseConnection();
  const dnsValue = true;

  try {
    const query = db.prepare(`UPDATE Athletes SET dns = ? WHERE bibId = ?`);
    query.run(Number(dnsValue), record.bibId);

    const query2 = db.prepare(`UPDATE StaEvents SET note = ? WHERE bibId = ?`);
    query2.run(record.note, record.bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `athlete:update bibId: ${record.bibId}, dns: ${dnsValue}, note: ${record.note}`;
  return [DatabaseStatus.Updated, message];
}

export function updateAthleteDNF(record: DNXRecord): [DatabaseStatus, string] {
  const db = getDatabaseConnection();
  const dnfValue = true;
  const dnfDateTime = parseCSVDate(record.dnsDateTime).toISOString();

  try {
    const query = db.prepare(
      `UPDATE Athletes SET dnf = ?, dnfStation = ?, dnfDateTime = ? WHERE bibId = ?`
    );
    query.run(Number(dnfValue), record.stationId, dnfDateTime, record.bibId);

    const query2 = db.prepare(`UPDATE StaEvents SET note = ? WHERE bibId = ?`);
    query2.run(record.note, record.bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  function parseCSVDate(timingDate: string): Date {
    const event = new Date(Date.parse(timingDate));
    event.setFullYear(new Date().getFullYear());
    return event;
  }

  const message = `athlete:update bibId: ${record.bibId}, dnf: ${dnfValue}, dnfStation: ${record.stationId}, dnfDateTime: ${dnfDateTime}, note: ${record.note}`;
  return [DatabaseStatus.Updated, message];
}
