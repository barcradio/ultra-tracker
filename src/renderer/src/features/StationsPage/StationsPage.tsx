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

export function StationsPage() {
  const { data: currentStation } = useStation();
  const { data: stations } = useStations();

  const { setValue, ...identityForm } = useIdentityForm(currentStation);

  const stationOptions = useMemo(() => createStationOptions(stations), [stations]);
  const { data: currentOperators } = useStationOperators(identityForm.watch("identifier"));

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
      width: "190px",
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
      valueFn: (station) => station.distance.toFixed(1),
      sortable: false
    },
    {
      field: "dropbags",
      name: "Bags",
      valueFn: (station) => (station.dropbags ? "Yes" : "No"),
      width: "80px",
      sortable: false
    },
    {
      field: "crewaccess",
      name: "Crew",
      valueFn: (station) => (station.crewaccess ? "Yes" : "No"),
      width: "80px",
      sortable: false
    },
    {
      field: "paceraccess",
      name: "Pacer",
      valueFn: (station) => (station.paceraccess ? "Yes" : "No"),
      width: "80px",
      sortable: false
    },
    {
      field: "shiftBegin",
      name: "Open",
      valueFn: (station) => formatShortDate(new Date(station.shiftBegin)),
      width: "135px",
      sortable: false
    },
    {
      field: "cutofftime",
      name: "Cutoff",
      valueFn: (station) => formatShortDate(new Date(station.cutofftime)),
      width: "135px",
      sortable: false
    },
    {
      field: "shiftEnd",
      name: "Close",
      valueFn: (station) => formatShortDate(new Date(station.shiftEnd)),
      width: "135px",
      sortable: false
    },
    {
      field: "entrymode",
      name: "Mode",
      valueFn: (station) => EntryMode[station.entrymode].toString(),
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
      </Stack>
      <div style={{ height: "100vh", paddingTop: "10px" }}>
        <DataGrid data={stations ?? []} columns={columns} getKey={({ identifier }) => identifier} />
      </div>
    </div>
  );
}
