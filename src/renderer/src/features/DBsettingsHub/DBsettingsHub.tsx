import { Button, Stack } from "~/components";
import { useClearDatabase, useInitializeDatabase } from "~/hooks/useDatabaseUtilities";
import {
  useExportRunnersToCSV,
  useLoadAthletes,
  useLoadStationsFile
} from "~/hooks/useFileDialogs";
import { useToasts } from "../Toasts/useToasts";

export function DBsettingsHub() {
  const loadAthletes = useLoadAthletes();
  const loadStation = useLoadStationsFile();
  const initializeDatabaseMutation = useInitializeDatabase();
  const clearDatabaseMutation = useClearDatabase();
  const exportRunnersFile = useExportRunnersToCSV();
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
            Load Start List
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
          <Button onClick={initializeDatabase}>Init Database</Button>
          <Button onClick={clearDatabase}>Clear Database</Button>
          <Button>Reload Database from CSV </Button>
        </Stack>
      </Stack>
    </div>
  );
}
