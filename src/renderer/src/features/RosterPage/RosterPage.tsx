import { Tag } from "~/components/Tag";
import { useAthletes } from "~/hooks/data/useAthletes";
import { DNFType } from "$shared/enums";
import { AthleteDB } from "$shared/models";
import { EmergencyContact } from "./EmergencyContact";
import { ColumnDef, DataGrid } from "../DataGrid";

const renderStatusTag = (dnfType: DNFType, dns: boolean) => {
  let tag;

  if (dns == (undefined || null) && dnfType == (undefined || null)) {
    return <> </>;
  } else if (dnfType) {
    switch (dnfType) {
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
  } else if (dns) {
    return <Tag color="blue">DNS</Tag>;
  }

  return tag;
};

export function RosterPage() {
  const { data } = useAthletes();

  const columns: ColumnDef<AthleteDB> = [
    {
      field: "bibId",
      name: "Bib",
      width: "6%",
      align: "right"
    },
    {
      field: "dnfType",
      name: "Status",
      render: (dnfType, { dns }) => renderStatusTag(dnfType!, dns!),
      valueFn: (athlete) =>
        `${athlete.dnfType! === DNFType.None ? "" : athlete.dnfType}, ${athlete.dns! ? "DNS" : ""}`,
      width: "8%"
    },
    {
      field: "firstName",
      name: "Name",
      valueFn: (athlete) => `${athlete.firstName} ${athlete.lastName}`,
      width: "18%"
    },
    {
      field: "age",
      width: "6%"
    },
    {
      field: "gender",
      width: "6%"
    },
    {
      field: "state",
      name: "Location",
      width: "20%",
      render: (state, { city }) => `${city}, ${state}`,
      valueFn: (athlete) => `${athlete.state}, ${athlete.city}`
    },
    {
      field: "emergencyName",
      name: "Emergency Contact",
      width: "20%",
      render: (value, row) => <EmergencyContact name={value} athlete={row} />
    },
    {
      field: "note",
      width: "6%",
      valueFn: ({ note }) => (note == null ? "" : note)
    }
  ];

  return (
    <div className="h-full bg-component">
      <DataGrid data={data ?? []} columns={columns} getKey={({ bibId }) => bibId} showFooter />
    </div>
  );
}
