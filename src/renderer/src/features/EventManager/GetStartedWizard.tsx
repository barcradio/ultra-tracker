import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
type EventSetupFileType = "athletes" | "drops";

interface ProgressState {
  stations: ImportStatus;
  athletes: ImportStatus;
  drops: ImportStatus;
}

export interface GetStartedWizardProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const initialProgress: ProgressState = {
  stations: "pending",
  athletes: "pending",
  drops: "pending"
};

export function GetStartedWizard({ open, setOpen }: GetStartedWizardProps) {
  const navigate = routeApi.useNavigate();
  const { createToast } = useToasts();
  const ipcRenderer = useIpcRenderer();
  const identityForm = useIdentityForm();
  const setStationIdentity = useSetStationIdentity(true);
  const createDatabase = useBasicIpcCall("create-event-database", {
    preToast: "Select a Stations file to create the event",
    suppressToasts: true
  });
  const importAthletes = useBasicIpcCall("import-selected-event-athletes-file", {
    preToast: "Importing selected Athletes file",
    suppressToasts: true
  });
  const importDrops = useBasicIpcCall("import-selected-event-drops-file", {
    preToast: "Importing selected Drops file",
    suppressToasts: true
  });
  const [progress, setProgress] = useState(initialProgress);
  const [running, setRunning] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<EventSetupFileType, string>>>(
    {}
  );
  const selectEventFile = useMutation({
    mutationFn: async (type: EventSetupFileType): Promise<string | null> => {
      return (await ipcRenderer.invoke(`select-event-${type}-file`)) as string | null;
    }
  });
  const stationsLoaded = progress.stations === "success";
  const { data: stations, refetch: refetchStations } = useStations(stationsLoaded);
  const selectedStationId = identityForm.watch("identifier");
  const selectedCallsign = identityForm.watch("callsign");
  const { data: currentOperators } = useStationOperators(selectedStationId);

  useEffect(() => {
    if (currentOperators) {
      identityForm.setValue("callsign", currentOperators["primary"]?.callsign);
    }
  }, [currentOperators, identityForm]);

  const reset = () => {
    setProgress(initialProgress);
    setRunning(false);
    setSelectedFiles({});
    identityForm.reset();
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !running) {
      reset();
      setOpen(false);
    }
  };

  const handleLoadStations = async () => {
    setRunning(true);
    setProgress((current) => ({ ...current, stations: "working" }));

    try {
      const result = (await createDatabase.mutateAsync()) as [
        string | null,
        DatabaseStatus,
        string
      ];
      if (result[1] !== DatabaseStatus.Created) {
        throw new Error(result[2] || "Unable to create the event database");
      }
      setProgress((current) => ({ ...current, stations: "success" }));
      await refetchStations();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load the Stations file";
      createToast({ message, type: "danger" });
      setProgress((current) => ({ ...current, stations: "error" }));
    } finally {
      setRunning(false);
    }
  };

  const handleSelectEventFile = async (type: EventSetupFileType) => {
    const fileName = await selectEventFile.mutateAsync(type);
    if (fileName) {
      setSelectedFiles((current) => ({ ...current, [type]: fileName }));
    }
  };

  const handleStart = identityForm.handleSubmit(async (identity) => {
    if (!identity.identifier || !identity.callsign) {
      createToast({ message: "Select a station and operator callsign", type: "danger" });
      return;
    }

    if (!selectedFiles.athletes || !selectedFiles.drops) {
      createToast({
        message: "Select the athletes and drops files before importing",
        type: "danger"
      });
      return;
    }

    setRunning(true);
    setProgress((current) => ({
      ...current,
      stations: current.stations === "success" ? "success" : "working",
      athletes: current.athletes === "success" ? "success" : "pending",
      drops: current.drops === "success" ? "success" : "pending"
    }));

    try {
      if (progress.athletes !== "success") {
        setProgress((current) => ({ ...current, athletes: "working" }));
        await importAthletes.mutateAsync();
        setProgress((current) => ({ ...current, athletes: "success" }));
      }

      if (progress.drops !== "success") {
        setProgress((current) => ({ ...current, drops: "working" }));
        await importDrops.mutateAsync();
        setProgress((current) => ({ ...current, drops: "success" }));
      }

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
      setProgress((current) => ({
        ...current,
        stations: current.stations === "working" ? "error" : current.stations,
        athletes: current.athletes === "working" ? "error" : current.athletes,
        drops: current.drops === "working" ? "error" : current.drops
      }));
      setRunning(false);
    }
  });

  return (
    <Modal open={open} setOpen={handleClose} title="Get Started" size="md">
      <form onSubmit={handleStart} className="space-y-4 text-on-component">
        <p className="text-sm opacity-80">
          Load the Stations file, choose this computer&apos;s station identity, then import the
          remaining event files.
        </p>

        {stationsLoaded ? (
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outlined"
                onClick={() => handleSelectEventFile("athletes")}
                disabled={running || selectEventFile.isPending}
              >
                {selectedFiles.athletes ?? "Select Athletes File"}
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={() => handleSelectEventFile("drops")}
                disabled={running || selectEventFile.isPending}
              >
                {selectedFiles.drops ?? "Select Initial Drops File"}
              </Button>
            </div>
          </>
        ) : (
          <Button type="button" onClick={handleLoadStations} disabled={running}>
            {running ? "Loading..." : "Load Stations File"}
          </Button>
        )}

        <div className="rounded border border-component-strong px-3">
          <EventImportProgressRow label="Stations" status={progress.stations} />
          <EventImportProgressRow label="Athletes" status={progress.athletes} />
          <EventImportProgressRow label="Drops" status={progress.drops} />
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
          <Button
            type="submit"
            disabled={
              running ||
              !stationsLoaded ||
              !selectedCallsign ||
              !selectedFiles.athletes ||
              !selectedFiles.drops
            }
          >
            {running ? "Importing..." : "Import Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
