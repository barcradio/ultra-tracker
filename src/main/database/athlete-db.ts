import fs from "fs";
import { finished } from "stream/promises";
import { parse } from "csv-parse";
import { getDatabaseConnection } from "./connect-db";
import { initStatus } from "./status-db";
import { clearAthletesTable, createAthletesTable } from "./tables-db";
import { DatabaseStatus } from "../../shared/enums";
import { AthleteDB, AthleteStatusDB } from "../../shared/models";
import { DatabaseResponse } from "../../shared/types";
import { sendToastToRenderer } from "../ipc/toast-ipc";
import * as dialogs from "../lib/file-dialogs";

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

export function GetTotalAthletes(): number {
  const count = GetCountFromAthletes("bibId");
  return count[0] == null ? invalidResult : count[0];
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

export function GetAthletes(): DatabaseResponse<AthleteStatusDB[]> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db
      .prepare(
        `SELECT Athletes.*, Status.dns, Status.dnf, Status.dnfType, Status.note, Status.progress
         FROM Athletes LEFT JOIN Status
         WHERE Athletes.bibId == Status.bibId`
      )
      .all();
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `table Read Athletes - records:${queryResult.length}`;
  console.log(message);
  return [queryResult as AthleteStatusDB[], DatabaseStatus.Success, message];
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
    emergencyName: queryResult.emergencyName
  };

  message = `athletes:Found athlete with bibId: ${runner.bibId}`;
  console.log(message);
  return [runner, DatabaseStatus.Success, message];
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

  try {
    const query = db.prepare(
      `INSERT INTO Athletes (bibId, firstName, lastName, gender, age, city, state, emergencyPhone, emergencyName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    query.run(bibId, firstName, lastName, gender, age, city, state, emergencyPhone, emergencyName);
    initStatus(bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `athlete:add ${bibId}, ${firstName}, ${lastName}`;
  return [DatabaseStatus.Created, message];
}
