import { useEffect, useMemo } from "react";
import { Button, Select, Stack } from "~/components";
import { useStation } from "~/hooks/data/useStation";
import { useStations } from "~/hooks/data/useStations";
import { StationDB } from "$shared/models";
import { useIdentityForm } from "./hooks/useIdentityForm";
import { useStationOperators } from "./hooks/useStationOperators";
import { ColumnDef, DataGrid } from "../DataGrid";
import { formatDate } from "~/lib/datetimes";
import { EntryMode } from "$shared/enums";

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
      name: "Station"
    },
    {
      field: "location",
      name: "Lat/Long",
      valueFn: (station) => {
        const loc = JSON.parse(station.location);
        return loc.latitude + ", " + loc.longitude;
      }
    },
    {
      field: "location",
      name: "Alt",
      valueFn: (station) => {
        const loc = JSON.parse(station.location);
        return loc.elevation;
      }
    },
    {
      field: "distance",
      name: "Dist"
    },
    {
      field: "dropbags",
      name: "Bags",
      valueFn: (station) => (station.dropbags ? "Yes" : "No")
    },
    {
      field: "crewaccess",
      name: "Crew",
      valueFn: (station) => (station.crewaccess ? "Yes" : "No")
    },
    {
      field: "paceraccess",
      name: "Pacer",
      valueFn: (station) => (station.paceraccess ? "Yes" : "No")
    },
    {
      field: "shiftBegin",
      name: "Open",
      valueFn: (station) => formatDate(new Date(station.shiftBegin))
    },
    {
      field: "cutofftime",
      name: "Cutoff",
      valueFn: (station) => formatDate(new Date(station.cutofftime))
    },
    {
      field: "shiftEnd",
      name: "Close",
      valueFn: (station) => formatDate(new Date(station.shiftEnd))
    },
    {
      field: "entrymode",
      name: "Mode",
      valueFn: (station) => EntryMode[station.entrymode].toString()
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
