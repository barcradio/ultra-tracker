import { useAthletes } from "~/hooks/useAthletes";
import { formatPhone } from "~/lib/phone";
import { AthleteDB } from "$shared/models";
import { ColumnDef, DataGrid } from "../DataGrid";

const fullName = (athlete: AthleteDB) => `${athlete.firstName} ${athlete.lastName}`;
const stateCity = (athlete: AthleteDB) => `${athlete.state}, ${athlete.city}`;

export function SearchPage() {
  const { data } = useAthletes();

  const columns: ColumnDef<AthleteDB> = [
    {
      field: "bibId",
      name: "Bib",
      width: "6%"
    },
    {
      field: "firstName",
      name: "Name",
      render: (_, athlete) => fullName(athlete),
      sortFn: (a, b) => fullName(a).localeCompare(fullName(b)),
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
      sortFn: (a, b) => stateCity(a).localeCompare(stateCity(b))
    },
    {
      field: "emergencyName",
      name: "Emergency Contact",
      width: "20%",
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
