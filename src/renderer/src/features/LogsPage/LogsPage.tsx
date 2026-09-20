import { useEventLogs } from "~/hooks/data/useEventLogs";
import { formatDate } from "~/lib/datetimes";
import { EventLogRec } from "$shared/models";
import { ColumnDef, DataGrid } from "../DataGrid";

export function LogsPage() {
  const { data } = useEventLogs();

  const columns: ColumnDef<EventLogRec> = [
    {
      field: "timeModified",
      name: "Timestamp",
      render: formatDate,
      sample: "10:56:47 04 Sep"
    },
    {
      field: "stationId",
      name: "Station",
      sample: "9-station-longlongname"
    },
    {
      field: "bibId",
      name: "Bib",
      sample: "9999"
    },
    {
      field: "timeIn",
      name: "Time In",
      render: formatDate,
      sample: "10:56:47 04 Sep"
    },
    {
      field: "timeOut",
      name: "Time Out",
      render: formatDate,
      sample: "10:56:47 04 Sep"
    },
    {
      field: "comments",
      flexible: true,
      sample: "[Update](Time): bibId: (999)->(999), OK",
      sortable: false
    }
  ];

  return (
    <DataGrid
      data={data ?? []}
      columns={columns}
      getKey={({ index }) => index}
      initialSort={{ field: "timeModified", ascending: false }}
    />
  );
}
