import { Button, Stack } from "~/components";
import { useSettingsMutations } from "./hooks/useSettingsMutations";

export function SettingsHub() {
  const settingsMutations = useSettingsMutations();

  return (
    <div>
      <h1>
        <b>Settings Hub</b>
      </h1>
      <div>
        <Stack direction="row" align="stretch">
          <Stack direction="col">
            <b>Station Setup</b>
            <Button
              color="primary"
              size="md"
              onClick={() => settingsMutations.importStationsFile.mutate()}
            >
              Load Stations File
            </Button>
            <Button
              color="primary"
              size="md"
              onClick={() => settingsMutations.importAthletesFile.mutate()}
            >
              Load Athletes File
            </Button>
            <Button
              color="primary"
              size="md"
              onClick={() => settingsMutations.importDNSFile.mutate()}
            >
              Load DNS File
            </Button>
            <Button
              color="primary"
              size="md"
              onClick={() => settingsMutations.importDNFFile.mutate()}
            >
              Load DNF File
            </Button>
          </Stack>
        </Stack>
      </div>
      <div>
        <Stack direction="row" align="stretch">
          <Stack direction="col">
            <b>RFID Configuration [Start Line only]</b>
            <Button
              color="neutral"
              variant="outlined"
              onClick={() => settingsMutations.initializeRfid.mutate()}
            >
              Initialize RFID
            </Button>
          </Stack>
          <Stack direction="col">
            <b>App Settings</b>
            <Button color="warning" variant="outlined" onClick={settingsMutations.resetAppSettings}>
              Reset App Settings
            </Button>
          </Stack>
        </Stack>
      </div>
      <div>
        <Stack direction="col">
          <b>Developer Tools</b>
          <Button color="danger" variant="outlined" onClick={settingsMutations.initializeDatabase}>
            Destroy & Reinitialize Database
          </Button>
          <Button
            color="danger"
            variant="outlined"
            onClick={() => settingsMutations.importRunnerCSVFile.mutate()}
          >
            Recover Data from CSV File
          </Button>
        </Stack>
      </div>
    </div>
  );
}
