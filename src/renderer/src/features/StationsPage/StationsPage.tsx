import { useEffect, useMemo } from "react";
import { Button, Select, Stack } from "~/components";
import { useStation } from "~/hooks/data/useStation";
import { useStations } from "~/hooks/data/useStations";
import { formatShortDate } from "~/lib/datetimes";
import { EntryMode } from "$shared/enums";
import { StationDB } from "$shared/models";
import { useIdentityForm } from "./hooks/useIdentityForm";
import { useStationOperators } from "./hooks/useStationOperators";
import { ColumnDef, DataGrid } from "../DataGrid";

function createStationOptions(stations?: StationDB[]) {
  if (!stations) return [];
  return stations?.map((station) => {
    const id = station.identifier.split("-", 1)[0];
    return { value: station.identifier, name: `${id} ${station.name}` };
  });
}

function useEntryModeInfo() {
  const { data: station } = useStation();
  const entryModeLabel =
    station?.entrymode == EntryMode.Fast ? (
      <span className="font-bold">Fast Mode &#128007;</span>
    ) : (
      <span className="font-bold">Normal Mode &#127939;</span>
    );
  return { entryModeLabel };
}

export function StationsPage() {
  const { data: currentStation } = useStation();
  const { data: stations } = useStations();

  const { setValue, ...identityForm } = useIdentityForm(currentStation);

  const stationOptions = useMemo(() => createStationOptions(stations), [stations]);
  const { data: currentOperators } = useStationOperators(identityForm.watch("identifier"));

  const { entryModeLabel } = useEntryModeInfo();

  useEffect(() => {
    if (currentOperators) setValue("callsign", currentOperators["primary"]?.callsign);
  }, [currentOperators, setValue]);

  const columns: ColumnDef<StationDB> = [
    {
      field: "name",
      name: "Station",
      valueFn: (station) => `${station.identifier.split("-")[0]} ${station.name}`,
      width: "20%",
      sortable: false
    },
    {
      field: "location",
      name: "Lat/Long",
      valueFn: (station) => {
        const loc = JSON.parse(station.location);
        return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
      },
      width: "15%",
      sortable: false
    },
    {
      field: "location",
      name: "Alt",
      valueFn: (station) => {
        const loc = JSON.parse(station.location);
        return loc.elevation;
      },
      width: "80px",
      sortable: false
    },
    {
      field: "distance",
      name: "Dist",
      width: "80px",
      align: "right",
      render: (value) => value.toFixed(1),
      sortable: false
    },
    {
      field: "dropbags",
      name: "Bags",
      render: (value) => (value ? "Yes" : "No"),
      width: "80px",
      sortable: false
    },
    {
      field: "crewaccess",
      name: "Crew",
      render: (value) => (value ? "Yes" : "No"),
      width: "80px",
      sortable: false
    },
    {
      field: "paceraccess",
      name: "Pacer",
      render: (value) => (value ? "Yes" : "No"),
      width: "80px",
      sortable: false
    },
    {
      field: "shiftBegin",
      name: "Open",
      render: (value) => formatShortDate(new Date(value)),
      width: "135px",
      sortable: false
    },
    {
      field: "cutofftime",
      name: "Cutoff",
      render: (value) => formatShortDate(new Date(value)),
      width: "135px",
      sortable: false
    },
    {
      field: "shiftEnd",
      name: "Close",
      render: (value) => formatShortDate(new Date(value)),
      width: "135px",
      sortable: false
    },
    {
      field: "entrymode",
      name: "Mode",
      render: (value) => EntryMode[value].toString(),
      width: "90px",
      sortable: false
    }
  ];

  return (
    <div>
      <Stack className="gap-4" align="center" as="form" onSubmit={identityForm.onSubmit}>
        <Select
          options={stationOptions}
          value={identityForm.watch("identifier")}
          onChange={(value) => setValue("identifier", String(value))}
          className="w-72"
        />
        <Select
          options={Object.values(currentOperators ?? {}).map((o) => ({
            value: o.callsign,
            name: o.callsign
          }))}
          value={identityForm.watch("callsign")}
          onChange={(value) => setValue("callsign", String(value))}
          className="w-72"
        />
        <Button className="px-5 py-[6.8px]">Apply</Button>
        <Stack justify="between" align="center" className="py-6 pl-4 m-4 text-2xl font-display">
          <p className="text-on-component">{entryModeLabel}</p>
        </Stack>
      </Stack>
      <div style={{ height: "100vh", paddingTop: "10px" }}>
        <DataGrid data={stations ?? []} columns={columns} getKey={({ identifier }) => identifier} />
      </div>
    </div>
  );
}
