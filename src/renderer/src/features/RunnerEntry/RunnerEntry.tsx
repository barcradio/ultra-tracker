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
      sample: "9999"
    },
    {
      field: "bibId",
      name: "Bib",
      align: "right",
      sample: "9999"
    },
    {
      field: "in",
      name: "In Time",
      render: (value) => <InTimeCell value={value} />,
      sample: "10:56:50 04 Sep"
    },
    {
      field: "out",
      name: "Out Time",
      render: formatDate,
      sample: "10:56:50 04 Sep"
    },
    {
      field: "dropReason",
      name: "Status",
      truncate: false,
      render: (dropReason, { status }) => (
        <StatusTag dropReason={dropReason} duplicate={status === RecordStatus.Duplicate} />
      ),
      valueFn: (data) =>
        data.dropReason! === DropReason.None
          ? ""
          : data.dropReason! === DropReason.DidNotStart
            ? "DNS"
            : data.dropReason,
      sample: "Duplicate"
    },
    {
      field: "note",
      name: "Notes",
      sortable: false,
      flexible: true,
      sample: "Reported wrong bib number",
      render: (note) => note || ""
    }
  ];

  return (
    <Stack className="gap-4 mt-0 h-full min-h-0" justify="stretch" align="stretch">
      <RunnerFormStats />
      <div className="h-full min-h-0 min-w-0 bg-component grow">
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
