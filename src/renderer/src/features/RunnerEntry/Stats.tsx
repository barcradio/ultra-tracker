import { type Stats, useStatsData } from "../../hooks/data/useStatsData";
import { ColumnDef, DataGrid } from "../DataGrid";

function useStats() {
  const { data: statsData } = useStatsData();

  if (statsData == undefined) return [];

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
      id: "Finished Race",
      value: formatStat(statsData?.finishedRace)
    },
    {
      id: "Total DNS",
      value: formatStat(statsData?.totalDNS)
    },
    {
      id: "Previous DNF",
      value: formatStat(statsData?.previousDNF)
    },
    {
      id: "Station DNF",
      value: formatStat(statsData?.stationDNF)
    },
    {
      id: "Total DNF",
      value: formatStat(statsData?.totalDNF)
    },
    {
      id: "Warnings",
      value: formatStat(statsData?.warnings)
    },
    {
      id: "Errors",
      value: formatStat(statsData?.errors)
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
}

export function Stats() {
  const stats = useStats();

  const Columns: ColumnDef<Stat> = [
    {
      field: "id",
      name: "Stats",
      sortable: false
    },
    {
      field: "value",
      name: "",
      sortable: false,
      align: "right",
      render: (value) => <span className="font-medium text-primary">{value}</span>
    }
  ];

  return <DataGrid data={stats} columns={Columns} headerClassName="text-primary" />;
}
