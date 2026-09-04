import { Stack } from "~/components";
import { StatusTag } from "~/components/StatusTag";
import { ColumnDef, DataGrid } from "~/features/DataGrid";
import { RowStatus } from "~/features/DataGrid/types";
import { formatDate } from "~/lib/datetimes";
import { DropReason, RecordStatus } from "$shared/enums";
import { EditRunner } from "./EditRunner";
import { InTimeCell } from "./InTimeCell";
import { RunnerFormStats } from "./RunnerFormStats";
import { RunnerEx, useRunnerData } from "../../hooks/data/useRunnerData";

function getRowStatus(row: RunnerEx): RowStatus {
  if (!row.openSplitTimeAuthenticated) return row.sent ? "exported" : "not-exported";

  return row.openSplitTimePushStatus ?? "pending";
}

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
      render: (value) => <InTimeCell value={value} />,
      width: "160px"
    },
    {
      field: "out",
      name: "Out Time",
      render: formatDate,
      width: "160px"
    },
    {
      field: "dropReason",
      name: "Status",
      truncate: false,
      render: (dropReason, { status }) => (
        <StatusTag dropReason={dropReason} duplicate={status === RecordStatus.Duplicate} />
      ),
      valueFn: (data) => `${data.dropReason! === DropReason.None ? "" : data.dropReason}`,
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
          rowStatus={getRowStatus}
        />
      </div>
    </Stack>
  );
}
