import { Tag } from "~/components/Tag";
import { useAthletes } from "~/hooks/data/useAthletes";
import { AthleteStatus, DNFType } from "$shared/enums";
import { AthleteDB } from "$shared/models";
import { EmergencyContact } from "./EmergencyContact";
import { ColumnDef, DataGrid } from "../DataGrid";

const renderStatusTag = (dnfType: DNFType, dns: boolean, status: AthleteStatus) => {
  let tag;

  if (dns == (undefined || null) && dnfType == (undefined || null)) {
    return <> </>;
  } else if (dnfType) {
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
  } else if (dns) {
    return <Tag color="blue">DNS</Tag>;
  } else {
    switch (status as AthleteStatus) {
      case AthleteStatus.Incoming:
        //tag = <Tag color="lightgreen"></Tag>;
        tag = <> </>;
        break;
      case AthleteStatus.Present:
        tag = <Tag color="lightorange">➠ In</Tag>;
        break;
      case AthleteStatus.Outgoing:
        tag = <Tag color="lightgray">Out ➠</Tag>;
        //tag = <>Out</>;
        break;
    }
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
      render: (dnfType, { dns, status }) => renderStatusTag(dnfType!, dns!, status!),
      valueFn: (athlete) =>
        `${athlete.dnfType! === DNFType.None ? "" : athlete.dnfType}
         ${athlete.status! === AthleteStatus.Incoming ? "Inbound" : ""}
         ${athlete.status! === AthleteStatus.Present ? "Onsite" : ""}
         ${athlete.status! === AthleteStatus.Outgoing && !athlete.dns! ? "Out" : ""}
         ${athlete.dns! ? "DNS" : ""}`,
      width: "9%"
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
