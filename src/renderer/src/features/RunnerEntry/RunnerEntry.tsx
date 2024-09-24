import { Stack } from "~/components";
import { StatusTag } from "~/components/StatusTag";
import { ColumnDef, DataGrid } from "~/features/DataGrid";
import { formatDate } from "~/lib/datetimes";
import { DNFType, RecordStatus } from "$shared/enums";
import { EditRunner } from "./EditRunner";
import { RunnerFormStats } from "./RunnerFormStats";
import { RunnerEx, useRunnerData } from "../../hooks/data/useRunnerData";

export function RunnerEntry() {
  const { data: runnerData } = useRunnerData();

  const columns: ColumnDef<RunnerEx> = [
    {
      field: "sequence",
      name: "Seq",
      align: "right",
      width: "80px"
    },
    {
      field: "bibId",
      name: "Bib",
      align: "right",
      width: "80px"
    },
    {
      field: "in",
      name: "In Time",
      render: formatDate,
      width: "160px"
    },
    {
      field: "out",
      name: "Out Time",
      render: formatDate,
      width: "160px"
    },
    {
      field: "dnfType",
      name: "Status",
      truncate: false,
      render: (dnfType, { dns, status }) => (
        <StatusTag dnfType={dnfType} dns={dns} duplicate={status === RecordStatus.Duplicate} />
      ),
      valueFn: (data) =>
        `${data.dnfType! === DNFType.None ? "" : data.dnfType + "dnf"},
         ${data.dns! ? "DNS" : ""}`,
      width: "118px"
    },
    {
      field: "note",
      name: "Notes",
      sortable: false,
      render: (note) => note || ""
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
