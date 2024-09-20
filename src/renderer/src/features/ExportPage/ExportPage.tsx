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

  return (
    <Stack className="w-full h-full bg-component" align="center" justify="center">
      <VerticalButtonGroup label="Export Tools">
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
    </Stack>
  );
}
