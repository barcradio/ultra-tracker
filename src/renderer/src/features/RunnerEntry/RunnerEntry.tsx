import { Stack } from "~/components";
import { ColumnDef, DataGrid } from "~/features/DataGrid";
import { formatDate } from "~/lib/datetimes";
import { EditRunner } from "./EditRunner";
import { RunnerFormStats } from "./RunnerFormStats";
import { type Runner, useUpdateRunnerData } from "../../hooks/useRunnerData";

export function RunnerEntry() {
  const RunnerData: Array<Runner> = useUpdateRunnerData();

  const columns: ColumnDef<Runner> = [
    {
      field: "sequence",
      name: "Sequence",
      align: "right"
    },
    {
      field: "runner",
      name: "Runner",
      align: "right"
    },
    {
      field: "in",
      name: "In Time",
      render: formatDate
    },
    {
      field: "out",
      name: "Out Time",
      render: formatDate
    },
    {
      field: "notes",
      name: "Notes",
      sortable: false
    }
  ];

  return (
    <Stack className="gap-4 m-4 mt-0 h-full" justify="stretch" align="stretch">
      <RunnerFormStats />
      <div className="h-full bg-component grow">
        <DataGrid
          data={RunnerData}
          columns={columns}
          actionButtons={(row) => <EditRunner runner={row} runners={RunnerData} />}
          initialSort={{
            field: "sequence",
            ascending: false
          }}
        />
      </div>
    </Stack>
  );
}
