import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "~/components/Button";
import { Modal } from "~/components/Modal";
import { Select } from "~/components/Select";
import { useIdentityForm } from "~/features/StationsPage/hooks/useIdentityForm";
import { useToasts } from "~/features/Toasts/useToasts";
import { useSetStationIdentity } from "~/hooks/data/useStation";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { DatabaseStatus } from "$shared/enums";
import { DatabaseResponse, EventArchivePreview } from "$shared/types";
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
  const { setValue } = identityForm;
  const setStationIdentity = useSetStationIdentity(true);
  const [archivePreview, setArchivePreview] = useState<EventArchivePreview | null>(null);
  const [progress, setProgress] = useState<ImportStatus>("pending");
  const [running, setRunning] = useState(false);
  const archiveLoaded = progress === "success" && archivePreview !== null;
  const stations = archivePreview?.stations ?? [];
  const summary = archivePreview?.summary;
  const selectedStationId = identityForm.watch("identifier");
  const selectedCallsign = identityForm.watch("callsign");
  const currentOperators = stations.find(
    (station) => station.identifier === selectedStationId
  )?.operators;

  useEffect(() => {
    if (currentOperators) {
      setValue("callsign", currentOperators["primary"]?.callsign);
    }
  }, [currentOperators, setValue]);

  const reset = () => {
    setArchivePreview(null);
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
      const [preview, status, message] = (await ipcRenderer.invoke(
        "select-event-archive-preview"
      )) as DatabaseResponse<EventArchivePreview>;
      if (status !== DatabaseStatus.Success || !preview) {
        throw new Error(message || "Unable to load the event file");
      }

      setArchivePreview(preview);
      setProgress("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load the event file";
      if (message === "No event file selected") {
        setProgress("pending");
      } else {
        createToast({ message, type: "danger" });
        setProgress("error");
      }
    } finally {
      setRunning(false);
    }
  };

  const handleStart = identityForm.handleSubmit(async (identity) => {
    if (!identity.identifier || !identity.callsign) {
      createToast({ message: "Select a station and operator callsign", type: "danger" });
      return;
    }

    if (!archivePreview) {
      createToast({ message: "Load an event file before importing", type: "danger" });
      return;
    }

    setRunning(true);
    setProgress("working");

    try {
      const [, status, message] = (await ipcRenderer.invoke(
        "create-event-database-from-archive",
        archivePreview.archiveFilePath
      )) as DatabaseResponse<string>;
      if (status !== DatabaseStatus.Created) {
        throw new Error(message || "Unable to create the event database");
      }

      await setStationIdentity.mutateAsync(identity);
      sessionStorage.setItem("skip-event-manager-auto-open", "true");
      await ipcRenderer.invoke("finish-event-setup");
      createToast({ message: "Event created and initial files imported", type: "success" });
      setProgress("success");
      setRunning(false);
      setOpen(false);
      await navigate({ to: "/" });
    } catch (error) {
      sessionStorage.removeItem("skip-event-manager-auto-open");
      const message = error instanceof Error ? error.message : "Unable to create the event";
      createToast({ message, type: "danger" });
      setProgress("error");
      setRunning(false);
    }
  });

  return (
    <Modal
      open={open}
      setOpen={handleClose}
      title="Get Started"
      size="md"
      dismissOnClickOutside={false}
    >
      <form onSubmit={handleStart} className="space-y-4 text-on-component">
        <p className="text-sm opacity-80">Load an event file and select the station identity.</p>

        <div className="rounded border border-component-strong px-3">
          <EventImportProgressRow label="Event File" status={progress} />
          {archiveLoaded && summary ? (
            <div className="grid gap-2 pb-3 pt-1 text-sm sm:grid-cols-3">
              <div className="sm:col-span-3">
                <div className="font-medium">Name: {archivePreview.eventName}</div>
                <div className="text-xs opacity-80">
                  {summary.courseDistance !== undefined && (
                    <span>{summary.courseDistance} mi </span>
                  )}
                  {(summary.startStationName || summary.finishStationName) && (
                    <span>
                      {[summary.startStationName, summary.finishStationName]
                        .filter(Boolean)
                        .join(" -> ")}
                    </span>
                  )}
                </div>
                {(summary.startTime || summary.endTime) && (
                  <div className="text-xs opacity-70">
                    {[summary.startTime, summary.endTime].filter(Boolean).join(" to ")}
                  </div>
                )}
              </div>
              {[
                ["Stations", stations.length],
                ["Athletes", summary.athleteCount],
                ["Drops", summary.dropCount]
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-component px-2 py-1">
                  <div className="text-base font-semibold leading-tight">{value}</div>
                  <div className="text-xs opacity-70">{label}</div>
                </div>
              ))}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80 sm:col-span-3">
                {summary.openSplitTime.map((openSplitTime) => (
                  <span key={openSplitTime.environment}>
                    OpenSplitTime {openSplitTime.environment}: {openSplitTime.name} (#
                    {openSplitTime.id})
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

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
                setValue("identifier", String(value));
                setValue("callsign", "");
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
              onChange={(value) => setValue("callsign", String(value))}
              placeholder="Select an operator"
              disabled={running || !selectedStationId}
            />
          </>
        ) : (
          <Button type="button" onClick={handleLoadArchive} disabled={running}>
            {running ? "Loading..." : "Load Event File"}
          </Button>
        )}

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
