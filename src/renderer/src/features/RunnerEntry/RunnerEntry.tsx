import { Stack } from "~/components";
import { Tag } from "~/components/Tag";
import { ColumnDef, DataGrid } from "~/features/DataGrid";
import { formatDate } from "~/lib/datetimes";
import { DNFType } from "$shared/enums";
import { EditRunner } from "./EditRunner";
import { RunnerFormStats } from "./RunnerFormStats";
import { RunnerEx, useRunnerData } from "../../hooks/data/useRunnerData";

const renderDNFTag = (dnfType?: DNFType) => {
  switch (dnfType) {
    case DNFType.Withdrew:
      return <Tag color="turquoise">Withdrew</Tag>;
    case DNFType.Timeout:
      return <Tag color="purple">Timeout</Tag>;
    case DNFType.Medical:
      return <Tag color="red">Medical</Tag>;
    case DNFType.Unknown:
      return <Tag color="red">Unknown</Tag>;
    case DNFType.None:
    default:
      return <> </>;
  }
};

const sortDNF = (a: RunnerEx, b: RunnerEx) => {
  if (a.dnfType == DNFType.None) return -1;
  if (b.dnfType == DNFType.None) return 1;
  return a.dnfType.localeCompare(b.dnfType);
};

export function RunnerEntry() {
  const { data: runnerData } = useRunnerData();

  const columns: ColumnDef<RunnerEx> = [
    {
      field: "sequence",
      name: "Seq",
      align: "right",
      width: "10%"
    },
    {
      field: "bibId",
      name: "Bib",
      align: "right",
      width: "10%"
    },
    {
      field: "in",
      name: "In Time",
      render: formatDate,
      width: "15%"
    },
    {
      field: "out",
      name: "Out Time",
      render: formatDate,
      width: "15%"
    },
    {
      field: "dnfType",
      name: "DNF",
      render: renderDNFTag,
      sortFn: sortDNF,
      width: "12%"
    },
    {
      field: "note",
      name: "Notes",
      sortable: false,
      width: "30%",
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
