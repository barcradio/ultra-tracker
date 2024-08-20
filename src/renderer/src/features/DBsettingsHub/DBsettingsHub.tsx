import { Button, Stack } from "~/components";
import * as dbUtilHooks from "~/hooks/useDatabaseUtilities";
import * as dialogHooks from "~/hooks/useFileDialogs";
import { useToasts } from "../Toasts/useToasts";

export function DBsettingsHub() {
  const loadAthletes = dialogHooks.useLoadAthletes();
  const loadStation = dialogHooks.useLoadStationsFile();
  const initializeDatabaseMutation = dbUtilHooks.useInitializeDatabase();
  const clearDatabaseMutation = dbUtilHooks.useClearDatabase();
  const importRunnersFile = dialogHooks.useImportRunnersFromCSV();
  const exportRunnersFile = dialogHooks.useExportRunnersToCSV();
  const { createToast } = useToasts();

  const getStationsFile = () => {
    createToast({ message: "Loading Stations file", type: "info" });
    loadStation.mutate("ping from the renderer!");
  };

  const getAthletesFile = () => {
    createToast({ message: "Getting Athletes", type: "info" });
    loadAthletes.mutate("ping from the renderer!");
  };

  const createRunnerCSVFile = () => {
    createToast({ message: "Exporting to CSV file", type: "info" });
    exportRunnersFile.mutate("ping from the renderer!");
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
          <Button color="primary" size="md" onClick={getStationsFile}>
            Load Stations File
          </Button>
          <Button color="primary" size="md" onClick={getAthletesFile}>
            Load Athletes File
          </Button>
        </Stack>
        <Stack direction="col">
          <b>Data Tools</b>
          <Button color="primary" size="md" onClick={createRunnerCSVFile}>
            Export to CSV File
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
            Import from CSV File
          </Button>
        </Stack>
      </Stack>
    </div>
  );
}
