import { Button, Stack, VerticalButtonGroup } from "~/components";
import { useBasicIpcCall } from "~/hooks/ipc/useBasicIpcCall";

export function ExportPage() {
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
        </VerticalButtonGroup>
        <VerticalButtonGroup label="Export Files" className="w-[22rem]">
          <Button color="primary" size="wide" onClick={() => openExportDirectory.mutate()}>
            Open Export Folder
          </Button>
        </VerticalButtonGroup>
      </Stack>
    </div>
  );
}
