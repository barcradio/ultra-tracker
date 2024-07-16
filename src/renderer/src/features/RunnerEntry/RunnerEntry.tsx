import { Stack } from "~/components";
import { ColumnDef, DataGrid } from "~/features/DataGrid";
import { formatDate } from "~/lib/datetimes";
import { EditRunner } from "./EditRunner";
import { RunnerFormStats } from "./RunnerFormStats";
import { useFakeData } from "./useFakeData";
import type { Runner } from "./useFakeData";

export function RunnerEntry() {
  const FakeData: Runner[] = useFakeData();

  const columns: ColumnDef<Runner> = [
    {
      field: "sequence",
      name: "Sequence",
      align: "right",
      width: 180
    },
    {
      field: "runner",
      name: "Runner",
      align: "right",
      width: 180
    },
    {
      field: "in",
      name: "In Time",
      render: formatDate,
      width: 200
    },
    {
      field: "out",
      name: "Out Time",
      render: formatDate,
      width: 200
    },
    {
      field: "notes",
      name: "Notes",
      sortable: false
    }
  ];

  return (
    <Stack className="m-4 mt-0 h-full" justify="stretch" align="stretch">
      <RunnerFormStats />
      <div className="h-full bg-component grow">
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
    </Stack>
  );
}
