import { Statement } from "better-sqlite3";
import { getDatabaseConnection } from "./connect";
import { Runner } from "../../shared/models";

export function LookupAthleteByBib(bibNumber: number): Runner | undefined {
  const db = getDatabaseConnection();

  let result: Runner | undefined;

  try {
    const Athlete = db.prepare(`SELECT * FROM Athletes WHERE bibId = ?`).get(bibNumber);

    // neither of these checks seem to work that well
    if (Athlete.bibId === undefined || typeof Athlete.bibId !== "number") return undefined;

    const runner: Runner = {
      index: Athlete.index,
      bib: Athlete.bibId,
      firstname: Athlete.firstName,
      lastname: Athlete.lastName,
      gender: Athlete.gender,
      age: Athlete.age,
      city: Athlete.city,
      state: Athlete.state,
      emPhone: Athlete.emergencyPhone,
      emName: Athlete.emergencyName,
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
