import { Button, Stack } from "~/components";
import * as dialogHooks from "~/hooks/ipc/useFileDialogs";
import { useToasts } from "../Toasts/useToasts";

export function ExportPage() {
  const exportRunnersFile = dialogHooks.useExportRunnersToCSV();
  const exportIncrementalFile = dialogHooks.useExportRunnersToIncrementalCSV();
  const exportDNSFile = dialogHooks.useExportDNSRunnersToCSV();
  const exportDNFFile = dialogHooks.useExportDNFRunnersToCSV();
  const { createToast } = useToasts();

  const createRunnerCSVFile = () => {
    createToast({ message: "Exporting to CSV file", type: "info" });
    exportRunnersFile.mutate("ping from the renderer!");
  };

  const createIncrementalCSVFile = () => {
    createToast({ message: "Exporting to CSV file", type: "info" });
    exportIncrementalFile.mutate("ping from the renderer!");
  };

  const createDNSCSVFile = () => {
    createToast({ message: "Exporting DNS to CSV file", type: "info" });
    exportDNSFile.mutate("ping from the renderer!");
  };

  const createDNFCSVFile = () => {
    createToast({ message: "Exporting DNF to CSV file", type: "info" });
    exportDNFFile.mutate("ping from the renderer!");
  };

  return (
    <div>
      <h1>
        <b>Settings Hub</b>
      </h1>
      <Stack direction="row" align="stretch">
        <Stack direction="col">
          <b>Data Tools</b>
          <Button color="primary" size="md" onClick={createIncrementalCSVFile}>
            Export Incremental CSV File
          </Button>
          <Button color="primary" size="md" onClick={createRunnerCSVFile}>
            Export Full CSV File
          </Button>
          <Button color="primary" size="md" onClick={createDNSCSVFile}>
            Export DNS CSV File
          </Button>
          <Button color="primary" size="md" onClick={createDNFCSVFile}>
            Export DNF CSV File
          </Button>
        </Stack>
      </Stack>
    </div>
  );
}
