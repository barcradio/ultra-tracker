// @ts-nocheck

import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { StatusTag } from "~/components/StatusTag";
import { useAthletes } from "~/hooks/data/useAthletes";
import { AthleteProgress, DropReason } from "$shared/enums";
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
      width: "70px",
      align: "right"
    },
    {
      field: "dropReason",
      name: "Status",
      render: (dropReason, { progress }) => (
        <StatusTag dropReason={dropReason} AthleteProgress={progress} />
      ),
      valueFn: (athlete) =>
        `${athlete.dropReason! === DropReason.None ? "" : athlete.dropReason! === DropReason.DidNotStart ? "DNS" : athlete.dropReason}
         ${athlete.progress! === AthleteProgress.Incoming ? "Incoming" : ""}
         ${athlete.progress! === AthleteProgress.Present ? "In" : ""}
         ${athlete.progress! === AthleteProgress.Outgoing && athlete.dropReason! !== DropReason.DidNotStart ? "Out" : ""}
         ${athlete.dropReason! === DropReason.DidNotStart ? "Not Started" : ""}`,
      width: "110px"
    },
    {
      field: "firstName",
      name: "Name",
      valueFn: (athlete) => `${athlete.firstName} ${athlete.lastName}`,
      width: "180px"
    },
    {
      field: "age",
      width: "70px"
    },
    {
      field: "gender",
      width: "70px"
    },
    {
      field: "state",
      name: "Location",
      width: "200px",
      render: (state, { city }) => `${city}, ${state}`,
      valueFn: (athlete) => `${athlete.state}, ${athlete.city}`
    },
    {
      field: "emergencyName",
      name: "Emergency Contact",
      width: "220px",
      render: (value, row) => <EmergencyContact name={value} athlete={row} />
    },
    {
      field: "note",
      width: "240px",
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
          navigate({ search: {} }); // TODO: fix TS2322
        }}
        initialFilter={
          firstName && lastName ? { firstName: `${firstName} ${lastName}` } : undefined
        }
      />
    </div>
  );
}
