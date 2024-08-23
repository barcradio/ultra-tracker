import { Stack } from "~/components";
import { ColumnDef, DataGrid } from "~/features/DataGrid";
import { formatDate } from "~/lib/datetimes";
import { EditRunner } from "./EditRunner";
import { RunnerFormStats } from "./RunnerFormStats";
import { RunnerWithSequence, useRunnerData } from "../../hooks/useRunnerData";

export function RunnerEntry() {
  const { data: runnerData } = useRunnerData();

  const columns: ColumnDef<RunnerWithSequence> = [
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
      render: (value) => formatDate(value)
    },
    {
      field: "out",
      name: "Out Time",
      render: (value) => formatDate(value)
    },
    {
      field: "note",
      name: "Note",
      sortable: false
    }
  ];

  return (
    <Stack className="gap-4 m-4 mt-0 h-full" justify="stretch" align="stretch">
      <RunnerFormStats />
      <div className="h-full bg-component grow">
        <DataGrid
          data={runnerData ?? []}
          columns={columns}
          actionButtons={(row) => <EditRunner runner={row} runners={runnerData ?? []} />}
          initialSort={{
            field: "sequence",
            ascending: false
          }}
        />
      </div>
    </Stack>
  );
}
