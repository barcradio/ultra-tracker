import { Button, Stack } from "~/components";
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
    <div>
      <h1>
        <b>Settings Hub</b>
      </h1>
      <Stack direction="row" align="stretch">
        <Stack direction="col">
          <b>Data Tools</b>
          <Button color="primary" size="md" onClick={() => createIncrementalCSVFile.mutate()}>
            Export Incremental CSV File
          </Button>
          <Button color="primary" size="md" onClick={() => createRunnerCSVFile.mutate()}>
            Export Full CSV File
          </Button>
          <Button color="primary" size="md" onClick={() => createDNSCSVFile.mutate()}>
            Export DNS CSV File
          </Button>
          <Button color="primary" size="md" onClick={() => createDNFCSVFile.mutate()}>
            Export DNF CSV File
          </Button>
        </Stack>
      </Stack>
    </div>
  );
}
