import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Select, Stack, TextInput } from "~/components";
import { useSetStationIdentity, useStation } from "~/hooks/data/useStation";
import { useStations } from "~/hooks/data/useStations";
import { StationDB } from "$shared/models";
import { SetStationIdentityParams } from "$shared/types";

function createStationOptions(stations?: StationDB[]) {
  if (!stations) return [];
  return stations?.map((station) => {
    const id = station.identifier.split("-", 1)[0];
    return { value: station.identifier, name: `${id} ${station.name}` };
  });
}

function useIdentityForm() {
  const { data: station } = useStation();
  const setStationIdentity = useSetStationIdentity();
  const identityForm = useForm<SetStationIdentityParams>({
    // TODO: Implement operator call sign
    defaultValues: { identifier: station?.identifier }
  });

  // Reset form when identity comes in
  useEffect(() => {
    // TODO: Implement operator call sign
    if (station) identityForm.reset({ identifier: station.identifier });
  }, [identityForm, station]);

  const onSubmit = identityForm.handleSubmit((identity) => {
    setStationIdentity.mutate(identity);
  });

  return { ...identityForm, onSubmit };
}

export function StationsPage() {
  const identityForm = useIdentityForm();

  const { data: stations } = useStations();
  const stationOptions = createStationOptions(stations);

  return (
    <div>
      <Stack className="gap-4" align="center" as="form" onSubmit={identityForm.onSubmit}>
        <Select
          options={stationOptions}
          value={identityForm.watch("identifier")}
          onChange={(value) => identityForm.setValue("identifier", String(value))}
          className="w-72"
        />
        <TextInput
          {...identityForm.register("callsign")}
          className="w-36"
          placeholder="Call Sign"
        />
        <Button className="px-5 py-[6.8px]">Apply</Button>
      </Stack>
    </div>
  );
}
