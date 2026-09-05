import { useAthletes } from "~/hooks/data/useAthletes";
import { useId } from "~/hooks/useId";
import { AthleteStatusDB } from "$shared/models";
import { WatchlistStat } from "./WatchlistStat";
import { type Stats, useStatsData } from "../../hooks/data/useStatsData";
import { useInvalidateRunnersOnRFID } from "../../hooks/ipc/useInvalidateRunnersOnRFID";
import { ColumnDef, DataGrid } from "../DataGrid";

function useStats() {
  const { data: statsData } = useStatsData();
  const { data: athletes } = useAthletes();
  useInvalidateRunnersOnRFID();

  if (!statsData) return [];

  const watchlistAthletes = (athletes ?? [])
    .filter((athlete) => athlete.watchlisted)
    .sort((first, second) => first.bibId - second.bibId);

  return [
    {
      id: "Registered Athletes",
      value: formatStat(statsData?.registeredAthletes)
    },
    {
      id: "Incoming Athletes",
      value: formatStat(statsData?.pendingArrivals)
    },
    {
      id: "In Station",
      value: formatStat(statsData?.inStation)
    },
    {
      id: "Through Station",
      value: formatStat(statsData?.throughStation)
    },
    {
      id: "Not Started",
      value: formatStat(statsData?.totalDidNotStart)
    },
    {
      id: "Prior Drops",
      value: formatStat(statsData?.previousDrops)
    },
    {
      id: "Station Drops",
      value: formatStat(statsData?.stationDrops)
    },
    {
      id: "Total Drops",
      value: formatStat(statsData?.totalDrops)
    },
    {
      id: "Watchlist",
      value: formatStat(statsData?.watchlistCount),
      watchlistAthletes
    },
    {
      id: " ",
      value: ""
    },
    {
      id: "Warnings",
      value: ""
    },
    {
      id: "- DNS In Station",
      value: formatStat(statsData?.inStationDidNotStart)
    },
    {
      id: "- Unknown Bibs",
      value: formatStat(statsData?.unknownAthletes)
    },
    {
      id: "Errors",
      value: ""
    },
    {
      id: "- Duplicates",
      value: formatStat(statsData?.duplicates)
    }
  ];
}

function formatStat(stat: number): number | string {
  const invalidResult = -999;
  const invalidString = "---";
  return stat != invalidResult ? stat : invalidString;
}

interface Stat {
  id: string;
  value: number | string;
  watchlistAthletes?: AthleteStatusDB[];
}

export function Stats() {
  const stats = useStats();
  const watchlistTooltipId = useId("watchlist-stat");

  const Columns: ColumnDef<Stat> = [
    {
      field: "id",
      name: "Stats",
      flexible: true,
      sample: "Registered Athletes",
      sortable: false
    },
    {
      field: "value",
      name: "",
      sortable: false,
      align: "right",
      sample: "9999",
      render: (value, stat) =>
        stat.id === "Watchlist" && stat.watchlistAthletes ? (
          <WatchlistStat
            athletes={stat.watchlistAthletes}
            value={value}
            tooltipId={watchlistTooltipId}
          />
        ) : (
          <span className="font-medium text-primary">{value}</span>
        )
    }
  ];

  return (
    <DataGrid
      data={stats}
      columns={Columns}
      classNames={{ header: "text-primary", table: "table-auto" }}
      rowClassName={(stat) =>
        stat.id === "Watchlist" ? `${watchlistTooltipId} cursor-help` : undefined
      }
    />
  );
}
