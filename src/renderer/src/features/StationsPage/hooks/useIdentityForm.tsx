import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSetStationIdentity } from "~/hooks/data/useStation";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { Station } from "$shared/models";
import { SetStationIdentityParams } from "$shared/types";

export function useIdentityForm(station?: Station) {
  const setStationIdentity = useSetStationIdentity();
  const ipcRenderer = useIpcRenderer();
  const [pendingIdentity, setPendingIdentity] = useState<SetStationIdentityParams | null>(null);
  const [recordsToMove, setRecordsToMove] = useState(0);

  const identityForm = useForm<SetStationIdentityParams>();

  // Reset form when identity comes in
  useEffect(() => {
    if (station) {
      const active = Object.values(station.operators).find((operator) => operator.active);
      identityForm.reset({ identifier: station.identifier, callsign: active?.callsign });
    }
  }, [identityForm, station]);

  const onSubmit = identityForm.handleSubmit(async (identity) => {
    if (identity.identifier === station?.identifier) {
      setStationIdentity.mutate(identity);
      return;
    }

    const held: number = await ipcRenderer.invoke(
      "count-records-for-other-stations",
      identity.identifier
    );

    if (held < 1) {
      setStationIdentity.mutate(identity);
      return;
    }

    setRecordsToMove(held);
    setPendingIdentity(identity);
  });

  const confirmStationChange = () => {
    if (!pendingIdentity) return;

    setStationIdentity.mutate({ ...pendingIdentity, moveTimingRecords: true });
    setPendingIdentity(null);
  };

  const cancelStationChange = () => {
    setPendingIdentity(null);
    identityForm.reset({
      identifier: station?.identifier,
      callsign: identityForm.getValues("callsign")
    });
  };

  return {
    ...identityForm,
    onSubmit,
    recordsToMove,
    stationChangePending: pendingIdentity !== null,
    confirmStationChange,
    cancelStationChange
  };
}
