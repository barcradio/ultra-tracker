import * as dbAthlete from "../database/athlete-db";
import * as dbRunners from "../database/runners-db";
import * as dbStatus from "../database/status-db";

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
  stats.addStat("totalDidNotStart", () => dbStatus.GetTotalDidNotStart());
  stats.addStat("previousDrops", () => dbStatus.GetPreviousDropped());
  stats.addStat("pendingArrivals", (input) => {
    if (
      input.registeredAthletes != invalidResult ||
      input.totalDidNotStart != invalidResult ||
      input.totalRunners != invalidResult
    ) {
      return (
        input.registeredAthletes - input.totalDidNotStart - input.previousDrops - input.totalRunners
      );
    } else {
      return invalidResult;
    }
  });
  stats.addStat("inStation", () => dbRunners.GetRunnersInStation());
  stats.addStat("throughStation", () => dbRunners.GetRunnersOutStation());
  stats.addStat("finishedRace", (input) => input.defaultValue);
  stats.addStat("stationDrops", () => dbStatus.GetStationDropped());
  stats.addStat("totalDrops", () => dbStatus.GetTotalDropped());

  stats.addStat("warnings", () => invalidResult);
  stats.addStat("inStationDidNotStart", () => dbRunners.GetDidNotStartRunnersInStation());
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
