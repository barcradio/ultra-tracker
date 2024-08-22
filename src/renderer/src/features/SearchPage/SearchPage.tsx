import { useAthletes } from "~/hooks/useAthletes";
import { formatPhone } from "~/lib/phone";
import { AthleteDB } from "$shared/models";
import { ColumnDef, DataGrid } from "../DataGrid";

export function SearchPage() {
  const { data } = useAthletes();

  const columns: ColumnDef<AthleteDB> = [
    {
      field: "bibId",
      name: "Bib ID"
    },
    {
      field: "firstName",
      name: "Name",
      render: (firstName, { lastName }) => `${firstName} ${lastName}`
    },
    {
      field: "age"
    },
    {
      field: "gender"
    },
    {
      field: "state",
      name: "Location",
      render: (state, { city }) => `${city}, ${state}`
    },
    {
      field: "emergencyName",
      name: "Emergency Contact",
      render: (emergencyName, { emergencyPhone }) =>
        `${emergencyName} - ${formatPhone(emergencyPhone)}`
    }
  ];

  return <DataGrid data={data ?? []} columns={columns} getKey={({ bibId }) => bibId} />;
}
