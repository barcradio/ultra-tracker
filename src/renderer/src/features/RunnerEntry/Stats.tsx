import { type Stats, useStatsData } from "../../hooks/data/useStatsData";
import { useInvalidateRunnersOnRFID } from "../../hooks/ipc/useInvalidateRunnersOnRFID";
import { ColumnDef, DataGrid } from "../DataGrid";

function useStats() {
  const { data: statsData } = useStatsData();
  useInvalidateRunnersOnRFID();

  if (!statsData) return [];

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
      id: "Total DNS",
      value: formatStat(statsData?.totalDNS)
    },
    {
      id: "Prior DNF",
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
      id: " ",
      value: ""
    },
    {
      id: "Warnings",
      value: ""
    },
    {
      id: "- In Station DNS",
      value: formatStat(statsData?.inStationDNS)
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

  return (
    <DataGrid
      data={stats}
      columns={Columns}
      classNames={{ header: "text-primary", table: "table-auto" }}
    />
  );
}
