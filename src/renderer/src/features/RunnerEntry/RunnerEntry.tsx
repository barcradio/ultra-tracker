import { Stack } from "~/components";
import { ColumnDef, DataGrid } from "~/features/DataGrid";
import { formatDate } from "~/lib/datetimes";
import { DNFType } from "$shared/enums";
import { EditRunner } from "./EditRunner";
import { RunnerFormStats } from "./RunnerFormStats";
import { RunnerEx, useRunnerData } from "../../hooks/data/useRunnerData";

export function RunnerEntry() {
  const { data: runnerData } = useRunnerData();

  const columns: ColumnDef<RunnerEx> = [
    {
      field: "sequence",
      name: "Seq",
      align: "right"
    },
    {
      field: "runner",
      name: "Bib",
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
      field: "dnfType",
      name: "DNF",
      render: (value) => value == (DNFType.None || undefined ? "" : value)
    },
    {
      field: "note",
      name: "Notes",
      sortable: false,
      width: "30%"
    }
  ];

  return (
    <Stack className="gap-4 mt-0 h-full" justify="stretch" align="stretch">
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
