import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DangerIcon from "~/assets/icons/error-octagon.svg?react";
import { Button, Modal, Stack, VerticalButtonGroup } from "~/components";
import { useToasts } from "~/features/Toasts/useToasts";
import { useBasicIpcCall } from "~/hooks/ipc/useBasicIpcCall";
import { useStoreValue } from "~/hooks/ipc/useStoreValue";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { DatabaseStatus } from "$shared/enums";
import { DatabaseResponse, StartLineDropsPreview, StartLineDropsReport } from "$shared/types";

export function ExportPage() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();
  const [startLinePreview, setStartLinePreview] = useState<StartLineDropsPreview | null>(null);
  const [startLineClosedConfirmed, setStartLineClosedConfirmed] = useState(false);

  const { data: stationIdentifier } = useStoreValue<string>("station.identifier");
  const { data: startline } = useStoreValue<string>("event.startline");
  const { data: rfidScanning } = useQuery({
    queryKey: ["rfid-is-scanning"],
    queryFn: () => ipcRenderer.invoke("rfid-is-scanning") as Promise<boolean>,
    refetchInterval: 1000
  });
  const isStartLineStation = Boolean(startline) && stationIdentifier === startline;
  const canGenerateStartLineDrops = isStartLineStation && rfidScanning === false;
  const hasBlockingStartLineIssues = Boolean(
    startLinePreview &&
    (startLinePreview.duplicateBibIds.length > 0 || startLinePreview.unknownBibIds.length > 0)
  );

  const createRunnerCSVFile = useBasicIpcCall("export-runners-file", {
    preToast: "Exporting to CSV file"
  });

  const createIncrementalCSVFile = useBasicIpcCall("export-incremental-file", {
    preToast: "Exporting to CSV file"
  });

  const createDropsCSVFile = useBasicIpcCall("export-drops-file", {
    preToast: "Exporting Drops to CSV file"
  });

  const openExportDirectory = useBasicIpcCall("open-export-dir", {
    preToast: "Opening shell to export folder"
  });

  const openStartLineDropsConfirmation = async () => {
    try {
      const [preview, status, message] = (await ipcRenderer.invoke(
        "preview-start-line-drops"
      )) as DatabaseResponse<StartLineDropsPreview>;

      if (status !== DatabaseStatus.Success || !preview) {
        createToast({ message, type: "danger" });
        return;
      }

      setStartLineClosedConfirmed(false);
      setStartLinePreview(preview);
    } catch (error) {
      createToast({ message: String(error), type: "danger" });
    }
  };

  const closeStartLineDropsConfirmation = () => {
    setStartLinePreview(null);
    setStartLineClosedConfirmed(false);
  };

  const generateStartLineDrops = async () => {
    try {
      const [report, status, message] = (await ipcRenderer.invoke(
        "generate-start-line-drops",
        startLineClosedConfirmed
      )) as DatabaseResponse<StartLineDropsReport>;

      createToast({ message, type: status === DatabaseStatus.Success ? "success" : "danger" });
      if (report) {
        createToast({
          message: report.exportMessage,
          type: report.exportStatus === "success" ? "success" : "danger"
        });
      }
    } catch (error) {
      createToast({ message: String(error), type: "danger" });
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-component p-6">
      <Stack justify="center" align="start" className="gap-6 flex-wrap xl:flex-nowrap min-w-full">
        <Stack direction="col" className="gap-6 w-[22rem]">
          <VerticalButtonGroup label="Export Tools" className="w-full">
            <Button color="primary" size="wide" onClick={() => createIncrementalCSVFile.mutate()}>
              Export Incremental CSV File
            </Button>
            <Button color="primary" size="wide" onClick={() => createRunnerCSVFile.mutate()}>
              Export Full CSV File
            </Button>
            <Button color="primary" size="wide" onClick={() => createDropsCSVFile.mutate()}>
              Export Drops CSV File
            </Button>
          </VerticalButtonGroup>
          <VerticalButtonGroup label="Start Line Export Tool" className="w-full">
            <Button
              color="primary"
              size="wide"
              disabled={!canGenerateStartLineDrops}
              onClick={() => void openStartLineDropsConfirmation()}
            >
              Generate Start Line Drops
            </Button>
            {rfidScanning && (
              <Stack direction="row" align="center" className="gap-2">
                <DangerIcon height={18} width={18} className="fill-danger" />
                <span className="text-on-surface">RFID is still scanning</span>
              </Stack>
            )}
          </VerticalButtonGroup>
        </Stack>
        <VerticalButtonGroup label="Export Files" className="w-[22rem]">
          <Button color="primary" size="wide" onClick={() => openExportDirectory.mutate()}>
            Open Export Folder
          </Button>
        </VerticalButtonGroup>
      </Stack>

      <Modal
        open={startLinePreview != null}
        setOpen={(open) => !open && closeStartLineDropsConfirmation()}
        title="Generate Start Line Drops"
        negativeText="Cancel"
        affirmativeText="Generate Drops"
        dangerous
        affirmativeDisabled={
          !startLinePreview || hasBlockingStartLineIssues || !startLineClosedConfirmed
        }
        onAffirmative={() => {
          void generateStartLineDrops();
          closeStartLineDropsConfirmation();
        }}
      >
        {startLinePreview && (
          <div className="text-left">
            <p>
              Only run this once the start line has officially closed. Running it early can mark
              athletes who have not yet started as did-not-start.
            </p>

            {hasBlockingStartLineIssues ? (
              <div className="mt-2">
                <p className="font-bold text-danger">Cannot continue</p>
                {startLinePreview.duplicateBibIds.length > 0 && (
                  <p className="mt-1">
                    Duplicate start line records: {startLinePreview.duplicateBibIds.join(", ")}
                  </p>
                )}
                {startLinePreview.unknownBibIds.length > 0 && (
                  <p className="mt-1">
                    Unknown start line bibs: {startLinePreview.unknownBibIds.join(", ")}
                  </p>
                )}
                <p className="mt-1">Fix these issues before exporting.</p>
              </div>
            ) : (
              <>
                <ul className="mt-2 list-disc list-inside">
                  <li>Registered: {startLinePreview.registeredCount}</li>
                  <li>Started: {startLinePreview.startedCount}</li>
                  <li>Already dropped: {startLinePreview.alreadyDroppedCount}</li>
                  <li>New DNS drops: {startLinePreview.newDropCount}</li>
                  <li>Duplicate records: {startLinePreview.duplicateBibIds.length}</li>
                  <li>Unknown athletes: {startLinePreview.unknownBibIds.length}</li>
                </ul>
                <label className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={startLineClosedConfirmed}
                    onChange={(e) => setStartLineClosedConfirmed(e.target.checked)}
                  />
                  <span>I confirm the start line is officially closed.</span>
                </label>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
