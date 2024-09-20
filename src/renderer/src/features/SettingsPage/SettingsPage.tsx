import { useState } from "react";
import { Button, Modal, Stack, VerticalButtonGroup } from "~/components";
import { useSettingsMutations } from "./hooks/useSettingsMutations";

export function SettingsPage() {
  const settingsMutations = useSettingsMutations();
  const [resetOpen, setResetOpen] = useState(false);
  const [recreateOpen, setRecreateOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);

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
            <Button color="danger" onClick={() => setResetOpen(true)} size="wide">
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
            <Button color="danger" size="wide" onClick={() => setRecreateOpen(true)}>
              Recreate Database
            </Button>
            <Button color="danger" size="wide" onClick={() => setRecoverOpen(true)}>
              Recover Data from CSV File
            </Button>
          </Stack>
        </VerticalButtonGroup>
      </Stack>

      <Modal
        open={resetOpen}
        setOpen={setResetOpen}
        title="Reset App Settings"
        showCloseButton
        affirmativeText="Reset"
        onAffirmative={settingsMutations.resetAppSettings}
      >
        <div className="text-center">
          Are you sure you want to reset all app settings?
          <span className="font-medium text-danger"> This action cannot be undone.</span>
        </div>
      </Modal>

      <Modal
        open={recreateOpen}
        setOpen={setRecreateOpen}
        title="Recreate Database"
        showCloseButton
        affirmativeText="Reset"
        onAffirmative={settingsMutations.reinitializeDatabase}
      >
        <div className="text-center">
          Are you sure you want to recreate the database?
          <span className="font-medium text-danger"> This action cannot be undone.</span>
        </div>
      </Modal>

      <Modal
        open={recoverOpen}
        setOpen={setRecoverOpen}
        title="Recover Data from CSV File"
        showCloseButton
        affirmativeText="Recover"
        onAffirmative={() => settingsMutations.importRunnerCSVFile.mutate()}
      >
        <div className="text-center">
          Are you sure you want to recover data from a preexisting Runners file?
          <span className="font-medium text-danger"> This action cannot be undone.</span>
        </div>
      </Modal>
    </Stack>
  );
}