import { getRouteApi } from "@tanstack/react-router";
import { StatusTag } from "~/components/StatusTag";
import { useAthletes } from "~/hooks/data/useAthletes";
import { useStations } from "~/hooks/data/useStations";
import { AthleteProgress, DropReason } from "$shared/enums";
import { AthleteStatusDB } from "$shared/models";
import { EmergencyContact } from "./EmergencyContact";
import { WatchlistToggle } from "./WatchlistToggle";
import { ColumnDef, DataGrid } from "../DataGrid";

const routeApi = getRouteApi(`/roster`);

export function RosterPage() {
  const { data } = useAthletes();
  const { data: stations } = useStations();

  const dropStationTitle = (athlete: AthleteStatusDB) => {
    if (!athlete.dropStation || athlete.dropReason === DropReason.None) return undefined;
    const station = stations?.find((station) => station.identifier === athlete.dropStation);
    const label = station
      ? `${station.identifier.split("-", 1)[0]} ${station.name}`
      : athlete.dropStation;
    return `Dropped at ${label}`;
  };

  const { firstName, lastName } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const columns: ColumnDef<AthleteStatusDB> = [
    {
      field: "bibId",
      name: "Bib",
      align: "right",
      sample: "9999"
    },
    {
      field: "dropReason",
      name: "Status",
      render: (dropReason, athlete) => (
        <StatusTag
          dropReason={dropReason}
          AthleteProgress={athlete.progress}
          title={dropStationTitle(athlete)}
        />
      ),
      valueFn: (athlete) =>
        `${athlete.dropReason! === DropReason.None ? "" : athlete.dropReason! === DropReason.DidNotStart ? "DNS" : athlete.dropReason}
         ${athlete.progress! === AthleteProgress.Incoming ? "Incoming" : ""}
         ${athlete.progress! === AthleteProgress.Present ? "In" : ""}
         ${athlete.progress! === AthleteProgress.Outgoing && athlete.dropReason! !== DropReason.DidNotStart ? "Out" : ""}
         ${athlete.dropReason! === DropReason.DidNotStart ? "Not Started" : ""}`,
      sample: "Not Started"
    },
    {
      field: "firstName",
      name: "Name",
      valueFn: (athlete) => `${athlete.firstName} ${athlete.lastName}`,
      sample: "Watermelon Chandelier"
    },
    {
      field: "age",
      sample: "100"
    },
    {
      field: "gender",
      sample: "M"
    },
    {
      field: "state",
      name: "Location",
      render: (state, { city }) => `${city}, ${state}`,
      valueFn: (athlete) => `${athlete.state}, ${athlete.city}`,
      sample: "Waterfall Meadow, XX"
    },
    {
      field: "emergencyName",
      name: "Emergency Contact",
      render: (value, row) => <EmergencyContact name={value} athlete={row} />,
      sample: "Pineapple Chandelier"
    },
    {
      field: "note",
      flexible: true,
      sample: "Reported wrong bib number",
      valueFn: ({ note }) => (note == null ? "" : note)
    }
  ];

  return (
    <div className="h-full bg-component">
      <DataGrid
        data={data ?? []}
        columns={columns}
        getKey={({ bibId }) => bibId}
        leadingAction={(athlete) => <WatchlistToggle athlete={athlete} />}
        leadingActionAlwaysVisible={({ watchlisted }) => watchlisted}
        onClearFilters={() => {
          // TODO: For some reason this requires two clicks to re-render
          navigate({ search: () => ({}) });
        }}
        initialFilter={
          firstName && lastName ? { firstName: `${firstName} ${lastName}` } : undefined
        }
      />
    </div>
  );
}
