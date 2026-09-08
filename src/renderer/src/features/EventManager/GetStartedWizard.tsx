import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "~/components/Button";
import { Modal } from "~/components/Modal";
import { Select } from "~/components/Select";
import { useIdentityForm } from "~/features/StationsPage/hooks/useIdentityForm";
import { useStationOperators } from "~/features/StationsPage/hooks/useStationOperators";
import { useToasts } from "~/features/Toasts/useToasts";
import { useSetStationIdentity } from "~/hooks/data/useStation";
import { useStations } from "~/hooks/data/useStations";
import { useBasicIpcCall } from "~/hooks/ipc/useBasicIpcCall";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { DatabaseStatus } from "$shared/enums";
import { EventImportProgressRow } from "./EventImportProgressRow";

const routeApi = getRouteApi("/");

type ImportStatus = "pending" | "working" | "success" | "error";

export interface GetStartedWizardProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function GetStartedWizard({ open, setOpen }: GetStartedWizardProps) {
  const navigate = routeApi.useNavigate();
  const { createToast } = useToasts();
  const ipcRenderer = useIpcRenderer();
  const identityForm = useIdentityForm();
  const setStationIdentity = useSetStationIdentity(true);
  const createDatabase = useBasicIpcCall("create-event-database-from-archive", {
    preToast: "Select an event file to create the event",
    suppressToasts: true
  });
  const [progress, setProgress] = useState<ImportStatus>("pending");
  const [running, setRunning] = useState(false);
  const archiveLoaded = progress === "success";
  const { data: stations, refetch: refetchStations } = useStations(archiveLoaded);
  const selectedStationId = identityForm.watch("identifier");
  const selectedCallsign = identityForm.watch("callsign");
  const { data: currentOperators } = useStationOperators(selectedStationId);

  useEffect(() => {
    if (currentOperators) {
      identityForm.setValue("callsign", currentOperators["primary"]?.callsign);
    }
  }, [currentOperators, identityForm]);

  const reset = () => {
    setProgress("pending");
    setRunning(false);
    identityForm.reset();
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !running) {
      reset();
      setOpen(false);
    }
  };

  const handleLoadArchive = async () => {
    setRunning(true);
    setProgress("working");

    try {
      const result = (await createDatabase.mutateAsync()) as [
        string | null,
        DatabaseStatus,
        string
      ];
      if (result[1] !== DatabaseStatus.Created) {
        throw new Error(result[2] || "Unable to create the event database");
      }
      setProgress("success");
      await refetchStations();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load the event file";
      createToast({ message, type: "danger" });
      setProgress("error");
    } finally {
      setRunning(false);
    }
  };

  const handleStart = identityForm.handleSubmit(async (identity) => {
    if (!identity.identifier || !identity.callsign) {
      createToast({ message: "Select a station and operator callsign", type: "danger" });
      return;
    }

    setRunning(true);

    try {
      await setStationIdentity.mutateAsync(identity);
      sessionStorage.setItem("skip-event-manager-auto-open", "true");
      await ipcRenderer.invoke("finish-event-setup");
      createToast({ message: "Event created and initial files imported", type: "success" });
      setRunning(false);
      setOpen(false);
      await navigate({ to: "/" });
    } catch (error) {
      sessionStorage.removeItem("skip-event-manager-auto-open");
      const message = error instanceof Error ? error.message : "Unable to create the event";
      createToast({ message, type: "danger" });
      setRunning(false);
    }
  });

  return (
    <Modal open={open} setOpen={handleClose} title="Get Started" size="md">
      <form onSubmit={handleStart} className="space-y-4 text-on-component">
        <p className="text-sm opacity-80">Load an event file and select the station identity.</p>

        {archiveLoaded ? (
          <>
            <Select
              label="Station identifier"
              options={(stations ?? []).map((station) => ({
                value: station.identifier,
                name: `${station.identifier.split("-", 1)[0]} ${station.name}`
              }))}
              value={selectedStationId}
              onChange={(value) => {
                identityForm.setValue("identifier", String(value));
                identityForm.setValue("callsign", "");
              }}
              placeholder="Select a station"
              disabled={running}
            />
            <Select
              label="Operator callsign"
              options={Object.values(currentOperators ?? {}).map((operator) => ({
                value: operator.callsign,
                name: operator.callsign
              }))}
              value={selectedCallsign}
              onChange={(value) => identityForm.setValue("callsign", String(value))}
              placeholder="Select an operator"
              disabled={running || !selectedStationId}
            />
          </>
        ) : (
          <Button type="button" onClick={handleLoadArchive} disabled={running}>
            {running ? "Loading..." : "Load Event File"}
          </Button>
        )}

        <div className="rounded border border-component-strong px-3">
          <EventImportProgressRow label="Event File" status={progress} />
        </div>

        {Object.values(identityForm.formState.errors).map((error) => (
          <p key={error.message} className="text-sm text-danger">
            {error.message}
          </p>
        ))}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            onClick={() => handleClose(false)}
            disabled={running}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={running || !archiveLoaded || !selectedCallsign}>
            {running ? "Importing..." : "Import Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
