import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSetStationIdentity } from "~/hooks/data/useStation";
import { Station } from "$shared/models";
import { SetStationIdentityParams } from "$shared/types";

export function useIdentityForm(station?: Station) {
  const setStationIdentity = useSetStationIdentity();

  const identityForm = useForm<SetStationIdentityParams>();

  // Reset form when identity comes in
  useEffect(() => {
    if (station) {
      const active = Object.values(station.operators).find((operator) => operator.active);
      identityForm.reset({ identifier: station.identifier, callsign: active?.callsign });
    }
  }, [identityForm, station]);

  const onSubmit = identityForm.handleSubmit((identity) => setStationIdentity.mutate(identity));

  return { ...identityForm, onSubmit };
}
