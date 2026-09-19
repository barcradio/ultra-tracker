import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, ConfirmationModal, Stack, VerticalButtonGroup } from "~/components";
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

  const { data: stationIdentifier } = useStoreValue<string>("station.identifier");
  const { data: startline } = useStoreValue<string>("event.startline");
  const { data: rfidScanning } = useQuery({
    queryKey: ["rfid-is-scanning"],
    queryFn: () => ipcRenderer.invoke("rfid-is-scanning") as Promise<boolean>,
    refetchInterval: 1000
  });
  const isStartLineStation = Boolean(startline) && stationIdentifier === startline;
  const canGenerateStartLineDrops = isStartLineStation && rfidScanning === false;

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
    const [preview, status, message] = (await ipcRenderer.invoke(
      "preview-start-line-drops"
    )) as DatabaseResponse<StartLineDropsPreview>;

    if (status !== DatabaseStatus.Success || !preview) {
      createToast({ message, type: "danger" });
      return;
    }

    setStartLinePreview(preview);
  };

  const generateStartLineDrops = async () => {
    const [report, status, message] = (await ipcRenderer.invoke(
      "generate-start-line-drops"
    )) as DatabaseResponse<StartLineDropsReport>;

    createToast({ message, type: status === DatabaseStatus.Success ? "success" : "danger" });
    if (report) createToast({ message: report.exportMessage, type: "success" });
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-component p-6">
      <Stack justify="center" align="start" className="gap-6 flex-wrap xl:flex-nowrap min-w-full">
        <VerticalButtonGroup label="Export Tools" className="w-[22rem]">
          <Button color="primary" size="wide" onClick={() => createIncrementalCSVFile.mutate()}>
            Export Incremental CSV File
          </Button>
          <Button color="primary" size="wide" onClick={() => createRunnerCSVFile.mutate()}>
            Export Full CSV File
          </Button>
          <Button color="primary" size="wide" onClick={() => createDropsCSVFile.mutate()}>
            Export Drops CSV File
          </Button>
          <Button
            color="primary"
            size="wide"
            disabled={!canGenerateStartLineDrops}
            onClick={() => void openStartLineDropsConfirmation()}
          >
            Generate Start Line Drops
          </Button>
        </VerticalButtonGroup>
        <VerticalButtonGroup label="Export Files" className="w-[22rem]">
          <Button color="primary" size="wide" onClick={() => openExportDirectory.mutate()}>
            Open Export Folder
          </Button>
        </VerticalButtonGroup>
      </Stack>

      <ConfirmationModal
        dangerous
        open={startLinePreview != null}
        setOpen={(open) => !open && setStartLinePreview(null)}
        title="Generate Start Line Drops"
        negativeText="Cancel"
        affirmativeText="Generate Drops"
        onAffirmative={() => void generateStartLineDrops()}
      >
        {startLinePreview && (
          <div className="text-left">
            <p>
              Only run this once the start line has officially closed. Running it early can mark
              athletes who have not yet started as did-not-start.
            </p>
            <ul className="mt-2 list-disc list-inside">
              <li>Registered: {startLinePreview.registeredCount}</li>
              <li>Started: {startLinePreview.startedCount}</li>
              <li>Already dropped: {startLinePreview.alreadyDroppedCount}</li>
              <li>New DNS drops: {startLinePreview.newDropCount}</li>
            </ul>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
