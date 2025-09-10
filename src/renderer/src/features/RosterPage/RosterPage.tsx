import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { StatusTag } from "~/components/StatusTag";
import { useAthletes } from "~/hooks/data/useAthletes";
import { AthleteProgress, DNFType } from "$shared/enums";
import { AthleteStatusDB } from "$shared/models";
import { EmergencyContact } from "./EmergencyContact";
import { ColumnDef, DataGrid } from "../DataGrid";

const routeApi = getRouteApi(`/roster`);

export function RosterPage() {
  const { data } = useAthletes();

  const { firstName, lastName } = routeApi.useSearch();
  const navigate = useNavigate();

  const columns: ColumnDef<AthleteStatusDB> = [
    {
      field: "bibId",
      name: "Bib",
      width: "6%",
      align: "right"
    },
    {
      field: "dnfType",
      name: "Status",
      render: (dnfType, { dns, progress }) => (
        <StatusTag dnfType={dnfType} dns={dns} AthleteProgress={progress} />
      ),
      valueFn: (athlete) =>
        `${athlete.dnfType! === DNFType.None ? "" : athlete.dnfType + "dnf"}
         ${athlete.progress! === AthleteProgress.Incoming ? "Incoming" : ""}
         ${athlete.progress! === AthleteProgress.Present ? "In" : ""}
         ${athlete.progress! === AthleteProgress.Outgoing && !athlete.dns! ? "Out" : ""}
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
      <DataGrid
        data={data ?? []}
        columns={columns}
        getKey={({ bibId }) => bibId}
        showFooter
        onClearFilters={() => {
          // TODO: For some reason this requires two clicks to re-render
          navigate({ search: {} });
        }}
        initialFilter={
          firstName && lastName ? { firstName: `${firstName} ${lastName}` } : undefined
        }
      />
    </div>
  );
}
