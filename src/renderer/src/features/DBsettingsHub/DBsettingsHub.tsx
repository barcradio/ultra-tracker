import { Button, Stack } from "~/components";
import * as dbUtilHooks from "~/hooks/ipc/useDatabaseUtilities";
import * as dialogHooks from "~/hooks/ipc/useFileDialogs";
import { useToasts } from "../Toasts/useToasts";

export function DBsettingsHub() {
  const loadAthletes = dialogHooks.useLoadAthletesFile();
  const loadStation = dialogHooks.useLoadStationsFile();
  const loadDNS = dialogHooks.useLoadDNSFile();
  const loadDNF = dialogHooks.useLoadDNFFile();
  const initializeDatabaseMutation = dbUtilHooks.useInitializeDatabase();
  const clearDatabaseMutation = dbUtilHooks.useClearDatabase();
  const importRunnersFile = dialogHooks.useImportRunnersFromCSV();
  const exportRunnersFile = dialogHooks.useExportRunnersToCSV();
  const exportIncrementalFile = dialogHooks.useExportRunnersToIncrementalCSV();
  const { createToast } = useToasts();

  const importAthletesFile = () => {
    createToast({ message: "Loading Athletes file", type: "info" });
    loadAthletes.mutate("ping from the renderer!");
  };

  const importStationsFile = () => {
    createToast({ message: "Loading Stations file", type: "info" });
    loadStation.mutate("ping from the renderer!");
  };

  const importDNSFile = () => {
    createToast({ message: "Loading DNS file", type: "info" });
    loadDNS.mutate("ping from the renderer!");
  };

  const importDNFFile = () => {
    createToast({ message: "Loading DNF file", type: "info" });
    loadDNF.mutate("ping from the renderer!");
  };

  const createRunnerCSVFile = () => {
    createToast({ message: "Exporting to CSV file", type: "info" });
    exportRunnersFile.mutate("ping from the renderer!");
  };

  const createIncrementalCSVFile = () => {
    createToast({ message: "Exporting to CSV file", type: "info" });
    exportIncrementalFile.mutate("ping from the renderer!");
  };

  const importRunnerCSVFile = () => {
    createToast({ message: "Importing from CSV file", type: "info" });
    importRunnersFile.mutate("ping from the renderer!");
  };

  const initializeDatabase = () => {
    createToast({ message: "Initialize database", type: "info" });
    initializeDatabaseMutation.mutate("ping from the renderer!");
  };

  const clearDatabase = () => {
    createToast({ message: "Loading Stations file", type: "info" });
    clearDatabaseMutation.mutate("ping from the renderer!");
  };

  return (
    <div>
      <h1>
        <b>DBpane Hub</b>
      </h1>

      <Stack direction="row" align="stretch">
        <Stack direction="col">
          <b>Station Setup</b>
          <Button color="primary" size="md" onClick={importStationsFile}>
            Load Stations File
          </Button>
          <Button color="primary" size="md" onClick={importAthletesFile}>
            Load Athletes File
          </Button>
          <Button color="primary" size="md" onClick={importDNSFile}>
            Load DNS File
          </Button>
          <Button color="primary" size="md" onClick={importDNFFile}>
            Load DNF File
          </Button>
        </Stack>
        <Stack direction="col">
          <b>Data Tools</b>
          <Button color="primary" size="md" onClick={createIncrementalCSVFile}>
            Export Incremental CSV File
          </Button>
          <Button color="primary" size="md" onClick={createRunnerCSVFile}>
            Export Full CSV File
          </Button>
        </Stack>
        <Stack direction="col">
          <b>Developer Tools</b>
          <Button color="warning" variant="outlined" onClick={initializeDatabase}>
            Init Database
          </Button>
          <Button color="warning" variant="outlined" onClick={clearDatabase}>
            Clear Database
          </Button>
          <Button color="warning" variant="outlined" onClick={importRunnerCSVFile}>
            Recover Data from CSV File
          </Button>
        </Stack>
      </Stack>
    </div>
  );
}
