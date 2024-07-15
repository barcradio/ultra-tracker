import { ColumnDef, DataGrid } from "~/features/DataGrid";
import { formatDate } from "~/lib/datetimes";
import { EditRunner } from "./EditRunner";
import { useFakeData } from "./useFakeData";
import type { Runner } from "./useFakeData";

export function RunnerEntry() {
  const FakeData: Runner[] = useFakeData();

  const columns: ColumnDef<Runner> = [
    {
      field: "sequence",
      name: "Sequence",
      align: "right",
      width: 200
    },
    {
      field: "runner",
      name: "Runner",
      align: "right",
      width: 200
    },
    {
      field: "in",
      name: "In Time",
      render: (row) => formatDate(row.in),
      width: 225
    },
    {
      field: "out",
      name: "Out Time",
      render: (row) => formatDate(row.out),
      width: 225
    },
    {
      field: "notes",
      name: "Notes",
      sortable: false
    }
  ];

  return (
    <div className="m-4 mt-0 h-full bg-component text-on-component">
      <DataGrid
        data={FakeData}
        columns={columns}
        actionButtons={(row) => <EditRunner runner={row} runners={FakeData} />}
        initialSort={{
          field: "sequence",
          ascending: false
        }}
      />
    </div>
  );
}
