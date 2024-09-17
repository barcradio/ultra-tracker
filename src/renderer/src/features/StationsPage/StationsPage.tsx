import { useEffect, useMemo } from "react";
import { Button, Select, Stack } from "~/components";
import { useStation } from "~/hooks/data/useStation";
import { useStations } from "~/hooks/data/useStations";
import { StationDB } from "$shared/models";
import { useIdentityForm } from "./hooks/useIdentityForm";
import { useStationOperators } from "./hooks/useStationOperators";

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
    </div>
  );
}
