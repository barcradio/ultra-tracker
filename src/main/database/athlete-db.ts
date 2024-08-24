import { data } from "../../preload/data";
import fs from "fs";
import { parse } from "csv-parse";
import { getDatabaseConnection } from "./connect-db";
import { AthleteDB, DatabaseStatus } from "../../shared/models";
import { loadAthleteFile } from "../lib/file-dialogs";

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

export function GetTotalAthletes(): number {
  return GetCountFromAthletes("bibId");
}

export function GetTotalDNS(): number {
  return GetCountFromAthletesWithWhere("dns", `dns == 1`);
}

export function GetTotalDNF(): number {
  return GetCountFromAthletesWithWhere("dnf", `dnf == 1`);
}

export function GetStationDNF(): number {
  return GetCountFromAthletesWithWhere("dnf", `dnfStation == ${data.station.id.toString()}`);
}

function GetCountFromAthletes(columnName: string): number {
  const db = getDatabaseConnection();

  try {
    const dataset = db.prepare(`SELECT COUNT(${columnName}) FROM Athletes`).get();
    console.log(`table Read Athletes - records:${dataset[`COUNT(${columnName})`]}`);
    return dataset[`COUNT(${columnName})`] as number;
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
    return 0;
  }
}

function GetCountFromAthletesWithWhere(columnName: string, whereStatement: string): number {
  const db = getDatabaseConnection();

  try {
    const dataset = db
      .prepare(`SELECT COUNT(${columnName}) FROM Athletes WHERE ${whereStatement}`)
      .get();
    console.log(`table Read Athletes - records:${dataset[`COUNT(${columnName})`]}`);
    return dataset[`COUNT(${columnName})`] as number;
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
    return 0;
  }
}

export function GetAthletes(): AthleteDB[] {
  const db = getDatabaseConnection();

  try {
    const query = db.prepare(`SELECT * FROM Athletes`);
    const dataset = query.all();
    console.log(`table Read Athletes - records:${dataset.length}`);
    return dataset as AthleteDB[];
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
    return [];
  }
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
