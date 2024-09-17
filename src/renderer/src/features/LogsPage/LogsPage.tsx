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
      width: "13%"
    },
    {
      field: "stationId",
      name: "Station",
      width: "15%"
    },
    {
      field: "bibId",
      name: "Bib",
      width: "7%"
    },
    {
      field: "timeIn",
      name: "Time In",
      render: formatDate,
      width: "13%"
    },
    {
      field: "timeOut",
      name: "Time Out",
      render: formatDate,
      width: "13%"
    },
    {
      field: "comments",
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
