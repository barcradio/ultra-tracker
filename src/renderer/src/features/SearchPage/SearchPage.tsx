import { useAthletes } from "~/hooks/useAthletes";
import { formatPhone } from "~/lib/phone";
import { AthleteDB } from "$shared/models";
import { ColumnDef, DataGrid } from "../DataGrid";

const fullName = (athlete: AthleteDB) => `${athlete.firstName} ${athlete.lastName}`;

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
      render: (_, athlete) => fullName(athlete),
      sortFn: (a, b) => fullName(a).localeCompare(fullName(b))
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

  return (
    <div className="h-full bg-component">
      <DataGrid
        data={data ?? []}
        columns={columns}
        getKey={({ bibId }) => bibId}
        initialSort={{
          field: "firstName",
          ascending: true
        }}
      />
    </div>
  );
}
