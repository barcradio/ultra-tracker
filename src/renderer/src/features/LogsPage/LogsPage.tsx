import { useEventLogs } from "~/hooks/data/useEventLogs";
import { formatDate } from "~/lib/datetimes";
import { EventLogRec } from "$shared/models";
import { ColumnDef, DataGrid } from "../DataGrid";

export function LogsPage() {
  const { data } = useEventLogs();

  const columns: ColumnDef<EventLogRec> = [
    {
      field: "bibId",
      name: "Bib#"
    },
    {
      field: "stationId",
      name: "Station"
    },
    {
      field: "timeIn",
      name: "Time In",
      render: (value) => formatDate(value)
    },
    {
      field: "timeOut",
      name: "Time Out",
      render: (value) => formatDate(value)
    },
    {
      field: "timeModified",
      name: "Logged At",
      render: (value) => formatDate(value)
    },
    {
      field: "comments"
    }
  ];

  return (
    <DataGrid
      data={data ?? []}
      columns={columns}
      getKey={({ timeModified }) => timeModified?.toISOString() ?? ""}
      initialSort={{ field: "timeModified", ascending: false }}
    />
  );
}
