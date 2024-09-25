import { Button, Stack, VerticalButtonGroup } from "~/components";
import { useBasicIpcCall } from "~/hooks/ipc/useBasicIpcCall";

export function ExportPage() {
  const createRunnerCSVFile = useBasicIpcCall("export-runners-file", {
    preToast: "Exporting to CSV file"
  });

  const createIncrementalCSVFile = useBasicIpcCall("export-incremental-file", {
    preToast: "Exporting to CSV file"
  });

  const createDNSCSVFile = useBasicIpcCall("export-dns-file", {
    preToast: "Exporting DNS to CSV file"
  });

  const createDNFCSVFile = useBasicIpcCall("export-dnf-file", {
    preToast: "Exporting DNF to CSV file"
  });

  const openExportDirectory = useBasicIpcCall("open-export-dir", {
    preToast: "Opening shell to export folder"
  });

  return (
    <Stack className="w-full h-full bg-component gap-4" align="center" justify="center">
      <VerticalButtonGroup label="Export Tools" className="mb-32">
        <Button color="primary" size="wide" onClick={() => createIncrementalCSVFile.mutate()}>
          Export Incremental CSV File
        </Button>
        <Button color="primary" size="wide" onClick={() => createRunnerCSVFile.mutate()}>
          Export Full CSV File
        </Button>
        <Button color="primary" size="wide" onClick={() => createDNSCSVFile.mutate()}>
          Export DNS CSV File
        </Button>
        <Button color="primary" size="wide" onClick={() => createDNFCSVFile.mutate()}>
          Export DNF CSV File
        </Button>
      </VerticalButtonGroup>
      <VerticalButtonGroup label="Export Files" className="align-text-top mb-32">
        <Button color="primary" size="wide" onClick={() => openExportDirectory.mutate()}>
          Open Export Folder
        </Button>
      </VerticalButtonGroup>
    </Stack>
  );
}
