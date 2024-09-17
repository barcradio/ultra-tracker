import { useAthletes } from "~/hooks/data/useAthletes";
import { AthleteDB } from "$shared/models";
import { EmergencyContact } from "./EmergencyContact";
import { ColumnDef, DataGrid } from "../DataGrid";

export function RosterPage() {
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
      valueFn: (athelete) => `${athelete.firstName} ${athelete.lastName}`,
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
    }
  ];

  return (
    <div className="h-full bg-component">
      <DataGrid data={data ?? []} columns={columns} getKey={({ bibId }) => bibId} showFooter />
    </div>
  );
}
