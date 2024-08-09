import { getDatabaseConnection } from "./connect";
import { Runner } from "../../shared/models";

export function LookupStartListRunnerByBib(bibNumber: number): Runner | undefined {
  const db = getDatabaseConnection();

  let result: Runner | undefined;

  try {
    const query = db.prepare(`SELECT * FROM StartList WHERE Bib = ?`);
    const startListRunner = query.get(bibNumber);

    // neither of these checks seem to work that well
    if (startListRunner.Bib === undefined || typeof startListRunner.Bib !== "number")
      return undefined;

    const runner: Runner = {
      index: startListRunner.index,
      bib: startListRunner.Bib,
      firstname: startListRunner.FirstName,
      lastname: startListRunner.LastName,
      gender: startListRunner.gender,
      age: startListRunner.Age,
      city: startListRunner.City,
      state: startListRunner.State,
      emPhone: startListRunner.EmergencyPhone,
      emName: startListRunner.EmergencyName,
      dns: false,
      dnf: false,
      dnfStation: 0,
      dnfDateTime: undefined
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
