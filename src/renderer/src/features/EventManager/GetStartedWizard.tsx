import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/Button";
import { Modal } from "~/components/Modal";
import { useToasts } from "~/features/Toasts/useToasts";
import { useBasicIpcCall } from "~/hooks/ipc/useBasicIpcCall";
import { useSetStationIdentity } from "~/hooks/data/useStation";
import { useIdentityForm } from "~/features/StationsPage/hooks/useIdentityForm";
import { DatabaseStatus } from "$shared/enums";

const routeApi = getRouteApi("/");

type ImportStatus = "pending" | "working" | "success" | "error";

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

function ProgressRow({ label, status }: { label: string; status: ImportStatus }) {
  const statusText = {
    pending: "Pending",
    working: "Loading...",
    success: "Complete",
    error: "Failed"
  }[status];

  return (
    <div className="flex items-center justify-between border-b border-component py-3 last:border-b-0">
      <span>{label}</span>
      <span
        className={
          status === "success"
            ? "text-success"
            : status === "error"
              ? "text-danger"
              : "opacity-70"
        }
      >
        {status === "working" ? "..." : statusText}
      </span>
    </div>
  );
}

export function GetStartedWizard({ open, setOpen }: GetStartedWizardProps) {
  const navigate = routeApi.useNavigate();
  const { createToast } = useToasts();
  const identityForm = useIdentityForm();
  const setStationIdentity = useSetStationIdentity();
  const createDatabase = useBasicIpcCall("create-event-database", {
    preToast: "Select a Stations file to create the event"
  });
  const importAthletes = useBasicIpcCall("load-athletes-file", {
    preToast: "Select an Athletes file"
  });
  const importDrops = useBasicIpcCall("load-drops-file", {
    preToast: "Select a Drops file"
  });
  const [progress, setProgress] = useState(initialProgress);
  const [running, setRunning] = useState(false);

  const reset = () => {
    setProgress(initialProgress);
    setRunning(false);
    identityForm.reset();
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !running) {
      reset();
      setOpen(false);
    }
  };

  const handleStart = identityForm.handleSubmit(async (identity) => {
    setRunning(true);
    setProgress((current) => ({
      ...current,
      stations: current.stations === "success" ? "success" : "working",
      athletes: current.athletes === "success" ? "success" : "pending",
      drops: current.drops === "success" ? "success" : "pending"
    }));

    try {
      if (progress.stations !== "success") {
        const result = (await createDatabase.mutateAsync()) as [string | null, DatabaseStatus, string];
        if (result[1] !== DatabaseStatus.Created) {
          throw new Error(result[2] || "Unable to create the event database");
        }
        setProgress((current) => ({ ...current, stations: "success" }));
      }

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
      setRunning(false);
      setOpen(false);
      await navigate({ to: "/" });
    } catch (error) {
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
          Select the event files when prompted, then choose the station identity for this computer.
        </p>

        <label className="block text-sm font-semibold">
          Station identifier
          <input
            {...identityForm.register("identifier", { required: "Station identifier is required" })}
            className="mt-1 w-full rounded border border-component-strong bg-component px-2 py-1"
            disabled={running}
          />
        </label>

        <label className="block text-sm font-semibold">
          Operator callsign
          <input
            {...identityForm.register("callsign", { required: "Operator callsign is required" })}
            className="mt-1 w-full rounded border border-component-strong bg-component px-2 py-1"
            disabled={running}
          />
        </label>

        <div className="rounded border border-component-strong px-3">
          <ProgressRow label="Stations" status={progress.stations} />
          <ProgressRow label="Athletes" status={progress.athletes} />
          <ProgressRow label="Drops" status={progress.drops} />
        </div>

        {Object.values(identityForm.formState.errors).map((error) => (
          <p key={error.message} className="text-sm text-danger">
            {error.message}
          </p>
        ))}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" color="neutral" onClick={() => handleClose(false)} disabled={running}>
            Cancel
          </Button>
          <Button type="submit" disabled={running}>
            {running ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
