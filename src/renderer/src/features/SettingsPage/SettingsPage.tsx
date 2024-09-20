import { Button, Stack } from "~/components";
import { VerticalButtonGroup } from "~/components/VerticalButtonGroup";
import { useSettingsMutations } from "./hooks/useSettingsMutations";

export function SettingsPage() {
  const settingsMutations = useSettingsMutations();

  return (
    <Stack className="w-full h-full bg-component" justify="center" align="center">
      <Stack justify="center" align="stretch" className="gap-4">
        <VerticalButtonGroup label="Station Setup">
          <Button size="wide" onClick={() => settingsMutations.importStationsFile.mutate()}>
            Load Stations File
          </Button>
          <Button size="wide" onClick={() => settingsMutations.importAthletesFile.mutate()}>
            Load Athletes File
          </Button>
          <Button size="wide" onClick={() => settingsMutations.importDNSFile.mutate()}>
            Load DNS File
          </Button>
          <Button size="wide" onClick={() => settingsMutations.importDNFFile.mutate()}>
            Load DNF File
          </Button>
        </VerticalButtonGroup>
        <Stack direction="col" className="gap-4" justify="stretch">
          <VerticalButtonGroup
            className="grow"
            label={
              <Stack direction="col">
                <span className="font-medium">RFID Configuration</span>
                <span className="text-xs font-medium">(Start Line Only)</span>
              </Stack>
            }
          >
            <Button size="wide" onClick={() => settingsMutations.initializeRfid.mutate()}>
              Initialize RFID
            </Button>
          </VerticalButtonGroup>
          <VerticalButtonGroup label="App Settings" className="grow">
            <Button color="danger" onClick={settingsMutations.resetAppSettings} size="wide">
              Reset App Settings
            </Button>
          </VerticalButtonGroup>
        </Stack>
        <VerticalButtonGroup label="Developer Tools" className="border-2 grow border-danger/30">
          <Stack direction="col" className="gap-2">
            <p className="w-80 text-on-surface-strong italic font-display text-sm font-bold mt-2 mb-4">
              This is a destructive operation! Under most circumstances you should not do this
              unless instructed do.
            </p>
            <Button color="danger" size="wide" onClick={settingsMutations.initializeDatabase}>
              Recreate Database
            </Button>
            <Button
              color="danger"
              size="wide"
              onClick={() => settingsMutations.importRunnerCSVFile.mutate()}
            >
              Recover Data from CSV File
            </Button>
          </Stack>
        </VerticalButtonGroup>
      </Stack>
    </Stack>
  );
}
