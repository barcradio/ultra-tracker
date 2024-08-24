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
    const defaultValue: number = -1;

    return this.stats.reduce(
      (result, stat) => {
        result[stat.name] = stat.rule(result);
        return result;
      },
      { defaultValue }
    );
  }
}

const stats: StatEngine = new StatEngine();

export function initStatEngine() {
  stats.addStat("registeredAthletes", () => dbAthlete.GetTotalAthletes());
  stats.addStat(
    "pendingArrivals",
    (input) => input.registeredAthletes - dbRunners.GetTotalRunners()
  );
  stats.addStat("inStation", () => dbRunners.GetRunnersInStation());
  stats.addStat("throughStation", () => dbRunners.GetRunnersOutStation());
  stats.addStat("finishedRace", (input) => input.defaultValue);
  stats.addStat("totalDNS", () => dbAthlete.GetTotalDNS());
  stats.addStat("stationDNF", () => dbAthlete.GetStationDNF());
  stats.addStat("totalDNF", () => dbAthlete.GetTotalDNF());
  stats.addStat("warnings", (input) => input.defaultValue);
  stats.addStat("errors", (input) => input.defaultValue);

  stats; // const engine: StatEngine<"defaultValue" | "inStation" | "throughStation">
}

export function Calculate() {
  const result = stats.calculate();
  return result;
}
