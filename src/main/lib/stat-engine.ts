import * as dbAthlete from "../database/athlete-db";
import * as dbRunners from "../database/runners-db";
import * as dbStatus from "../database/status-db";
import * as dbWatchlist from "../database/watchlist-db";

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

let stats: StatEngine = new StatEngine();

// Registering a statistic only stores its function, so this runs whether or not an event is
// open; the functions are not called until something asks for a calculation.
export function initStatEngine() {
  const invalidResult = -999;

  stats = new StatEngine();

  stats.addStat("registeredAthletes", () => dbAthlete.GetTotalAthletes());
  stats.addStat("totalRunners", () => dbRunners.GetTotalRunners());
  stats.addStat("totalDidNotStart", () => dbStatus.GetTotalDidNotStart());
  stats.addStat("previousDrops", () => dbStatus.GetPreviousDropped());
  stats.addStat("unknownAthletes", () => dbRunners.GetUnknownRunners());
  stats.addStat("pendingArrivals", (input) => {
    if (
      input.registeredAthletes != invalidResult &&
      input.totalDidNotStart != invalidResult &&
      input.previousDrops != invalidResult &&
      input.totalRunners != invalidResult &&
      input.unknownAthletes != invalidResult
    ) {
      return (
        input.registeredAthletes -
        input.totalDidNotStart -
        input.previousDrops -
        input.totalRunners +
        input.unknownAthletes // don't count unknown athletes against pending arrivals
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
  stats.addStat("watchlistCount", () => dbWatchlist.GetWatchlistCount());

  stats.addStat("warnings", () => invalidResult);
  stats.addStat("inStationDidNotStart", () => dbRunners.GetDidNotStartRunnersInStation());

  stats.addStat("errors", () => invalidResult);
  stats.addStat("duplicates", () => dbRunners.GetRunnersWithDuplicateStatus());

  // stats: StatEngine<"defaultValue" | "inStation" | "throughStation">
}

export function closeStatEngine() {
  stats = new StatEngine();
}

export function Calculate() {
  const result = stats.calculate();
  return result;
}
