import { Button, Stack } from "~/components";
import { useSettingsFns } from "./hooks/useSettingsFns";

export function SettingsHub() {
  const settingsFns = useSettingsFns();

  return (
    <div>
      <h1>
        <b>Settings Hub</b>
      </h1>
      <div>
        <Stack direction="row" align="stretch">
          <Stack direction="col">
            <b>Station Setup</b>
            <Button color="primary" size="md" onClick={settingsFns.importStationsFile}>
              Load Stations File
            </Button>
            <Button color="primary" size="md" onClick={settingsFns.importAthletesFile}>
              Load Athletes File
            </Button>
            <Button color="primary" size="md" onClick={settingsFns.importDNSFile}>
              Load DNS File
            </Button>
            <Button color="primary" size="md" onClick={settingsFns.importDNFFile}>
              Load DNF File
            </Button>
          </Stack>
        </Stack>
      </div>
      <div>
        <Stack direction="row" align="stretch">
          <Stack direction="col">
            <b>RFID Configuration [Start Line only]</b>
            <Button color="neutral" variant="outlined" onClick={settingsFns.rfidInitialize}>
              Initialize RFID
            </Button>
          </Stack>
          <Stack direction="col">
            <b>App Settings</b>
            <Button color="warning" variant="outlined" onClick={settingsFns.resetAppSettings}>
              Reset App Settings
            </Button>
          </Stack>
        </Stack>
      </div>
      <div>
        <Stack direction="col">
          <b>Developer Tools</b>
          <Button color="danger" variant="outlined" onClick={settingsFns.initializeDatabase}>
            Destroy & Reinitialize Database
          </Button>
          <Button color="danger" variant="outlined" onClick={settingsFns.importRunnerCSVFile}>
            Recover Data from CSV File
          </Button>
        </Stack>
      </div>
    </div>
  );
}
