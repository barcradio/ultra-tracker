import { Stack, Tag } from "~/components";
import { ColumnDef, DataGrid } from "~/features/DataGrid";
import { formatDate } from "~/lib/datetimes";
import { DNFType } from "$shared/enums";
import { EditRunner } from "./EditRunner";
import { RunnerFormStats } from "./RunnerFormStats";
import { RunnerEx, useRunnerData } from "../../hooks/data/useRunnerData";

const renderStatusTag = (dnfType: DNFType, dns: boolean) => {
  let tag: JSX.Element = <> </>;

  if (dns == (undefined || null) && dnfType == (undefined || null)) {
    return <> </>;
  }
  if (dnfType) {
    switch (dnfType as DNFType) {
      case DNFType.Withdrew:
        tag = <Tag color="turquoise">Withdrew</Tag>;
        break;
      case DNFType.Timeout:
        tag = <Tag color="purple">Timeout</Tag>;
        break;
      case DNFType.Medical:
        tag = <Tag color="red">Medical</Tag>;
        break;
      case DNFType.Unknown:
        tag = <Tag color="gray">Unknown</Tag>;
        break;
      case DNFType.None:
      default:
        tag = <> </>;
        break;
    }
  }
  if (dns) {
    tag = <Tag color="blue">DNS</Tag>;
  }

  return tag;
};

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
      render: (dnfType, { dns }) => renderStatusTag(dnfType!, dns!),
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
