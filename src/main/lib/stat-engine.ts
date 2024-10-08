import * as dbAthlete from "../database/athlete-db";
import * as dbRunners from "../database/runners-db";

type StatFn = (value: Record<string, number>) => number;

interface Stat {
  name: string;
  stat: StatFn;
}

class StatEngine {
  private stats: Stat[] = [];

  addStat(name: string, stat: StatFn) {
    this.stats.push({ name, stat });
  }

  calculate(): Record<string, number> {
    const defaultValue: number = -999;

    return this.stats.reduce(
      (result, stat) => {
        result[stat.name] = stat.stat(result);
        // console.debug(`stat: ${stat.name}: ${result[stat.name]}`);
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

  stats.addStat("warnings", () => invalidResult);
  stats.addStat("inStationDNS", () => dbRunners.GetDNSRunnersInStation());
  stats.addStat("unknownAthletes", () => dbRunners.GetUnknownRunners());

  stats.addStat("errors", () => invalidResult);
  stats.addStat("duplicates", () => dbRunners.GetRunnersWithDuplicateStatus());

  stats; // const engine: StatEngine<"defaultValue" | "inStation" | "throughStation">

  stats.calculate();
}

export function Calculate() {
  const result = stats.calculate();
  return result;
}
