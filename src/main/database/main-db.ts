import { Statement } from "better-sqlite3";
import { getDatabaseConnection } from "./connect-db";
import { AthleteDB } from "../../shared/models";

export function LookupAthleteByBib(bibNumber: number): AthleteDB | undefined {
  const db = getDatabaseConnection();

  let result: AthleteDB | undefined;

  try {
    const athlete = db
      .prepare(`SELECT * FROM Athletes WHERE bibId = ?`)
      .get(bibNumber) as AthleteDB;

    // neither of these checks seem to work that well
    if (athlete.bibId === undefined || typeof athlete.bibId !== "number") return undefined;

    const runner: AthleteDB = {
      index: athlete.index,
      bibId: athlete.bibId,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      gender: athlete.gender,
      age: athlete.age,
      city: athlete.city,
      state: athlete.state,
      emergencyPhone: athlete.emergencyPhone,
      emergencyName: athlete.emergencyName,
      dns: false,
      dnf: false,
      dnfStation: 0,
      dnfDateTime: null
    };

    result = runner;
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log(e.message);
      result = undefined;
    }
  }

  return result;
}

export function AthletesLoadTable(): boolean {
  const db = getDatabaseConnection();
  let CmdResult: Statement;
  let result: string;

  // Read file via a browser
  // fs.createReadStream()
  // .readFileSync('foo.txt','utf8');

  // Loop through the csv file

  //Get a line from the csv file (verify the column header names)

  //Format/convert data from strings into loadable data

  try {
    CmdResult = db.prepare(`INSERT INTO Athletes ("bibId", "firstName", "lastName", "gender",
      "age", "city", "state", "emergencyPhone", "emergencyName", )`);
    result = CmdResult.run();

    return true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      result = e.message;
      console.log(`Failed to delete 'Output' table ${result}`);
    }
    return false;
  }
}
