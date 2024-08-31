import * as dbAthlete from "../database/athlete-db";
import * as dbRunners from "../database/runners-db";

class StatEngine<K extends string = "defaultValue"> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stats: any[] = [];

  addStat<L extends string>(
    name: L,
    stat: (input: { [P in K]: number }) => number
  ): asserts this is StatEngine<K | L> {
    this.stats.push({ name, stat });
  }

  calculate(): { [P in K]: number } {
    const defaultValue: number = -999;

    return this.stats.reduce(
      (result, stat) => {
        result[stat.name] = stat.stat(result);
        return result;
      },
      { defaultValue }
    );
  }
}

const stats: StatEngine = new StatEngine();

export function initStatEngine() {
  const invalidResult = -999;

  stats.addStat("registeredAthletes", () => dbAthlete.GetTotalAthletes());
  stats.addStat("totalRunners", () => dbRunners.GetTotalRunners());
  stats.addStat("totalDNS", () => dbAthlete.GetTotalDNS());
  stats.addStat("previousDNF", () => dbAthlete.GetPreviousDNF());
  stats.addStat("pendingArrivals", (input) => {
    if (
      input.registeredAthletes != invalidResult ||
      input.totalDNS != invalidResult ||
      input.totalRunners != invalidResult
    ) {
      return input.registeredAthletes - input.totalDNS - input.previousDNF - input.totalRunners;
    } else {
      return invalidResult;
    }
  });
  stats.addStat("inStation", () => dbRunners.GetRunnersInStation());
  stats.addStat("throughStation", () => dbRunners.GetRunnersOutStation());
  stats.addStat("finishedRace", (input) => input.defaultValue);
  stats.addStat("stationDNF", () => dbAthlete.GetStationDNF());
  stats.addStat("totalDNF", () => dbAthlete.GetTotalDNF());
  stats.addStat("warnings", (input) => input.defaultValue);
  stats.addStat("errors", () => dbRunners.GetRunnersWithDuplicateStatus());

  stats; // const engine: StatEngine<"defaultValue" | "inStation" | "throughStation">

  stats.calculate();
}

export function Calculate() {
  console.log("[Stats: Calculate]");
  const result = stats.calculate();
  return result;
}
