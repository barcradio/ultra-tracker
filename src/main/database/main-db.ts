import { getDatabaseConnection } from "./connect";
import { Runner } from "../../shared/models";

export function LookupStartListRunnerByBib(bibNumber: number): Runner | undefined {
  const db = getDatabaseConnection();

  let result: Runner | undefined;

  try {
    const query = db.prepare(`SELECT * FROM StartList WHERE bibId = ?`);
    const startListRunner = query.get(bibNumber);

    // neither of these checks seem to work that well
    if (startListRunner.bibId === undefined || typeof startListRunner.bibId !== "number")
      return undefined;

    const runner: Runner = {
      index: startListRunner.index,
      bib: startListRunner.bibId,
      firstname: startListRunner.firstName,
      lastname: startListRunner.lastName,
      gender: startListRunner.gender,
      age: startListRunner.age,
      city: startListRunner.city,
      state: startListRunner.state,
      emPhone: startListRunner.emergencyPhone,
      emName: startListRunner.emergencyName,
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
