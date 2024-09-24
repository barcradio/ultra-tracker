import { useState } from "react";
import { Button, ConfirmationModal, Stack, VerticalButtonGroup } from "~/components";
import { useStoreValue } from "~/hooks/ipc/useStoreValue";
import { useRFIDStatus } from "./hooks/useRFIDStatus";
import { useSettingsMutations } from "./hooks/useSettingsMutations";
import { DeviceStatus } from "../../../../shared/enums";

function useShouldEnableRFID() {
  const { data: startline } = useStoreValue("event.startline");
  const { data: finishline } = useStoreValue("event.finishline");
  const { data: stationIdentifier } = useStoreValue("station.identifier");

  if (!startline || !stationIdentifier || !finishline) return false;
  return startline === stationIdentifier || finishline === stationIdentifier;
}

export function SettingsPage() {
  const settingsMutations = useSettingsMutations();
  const [resetOpen, setResetOpen] = useState(false);
  const [recreateOpen, setRecreateOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);

  const shouldEnableRFID = useShouldEnableRFID();
  const [rfidStatus] = useRFIDStatus();

  const handleRfidButtonClick = () => {
    if (rfidStatus === DeviceStatus.Connected || rfidStatus === DeviceStatus.Connecting) {
      settingsMutations.disconnectRfid.mutate();
    } else {
      settingsMutations.initializeRfid.mutate();
    }
  };

  const rfidButtonText =
    rfidStatus === DeviceStatus.Connected || rfidStatus === DeviceStatus.Connecting
      ? "Disconnect RFID"
      : "Initialize RFID";

  return (
    <Stack className="w-full h-full bg-component" justify="center" align="center">
      <Stack justify="center" align="stretch" className="gap-4 mb-32">
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
                <span className="text-xs font-medium">(Start and Finish Lines Only)</span>
              </Stack>
            }
          >
            <Button
              size="wide"
              onClick={() => handleRfidButtonClick()}
              disabled={!shouldEnableRFID}
            >
              {rfidButtonText}
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
              unless instructed to.
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

      <ConfirmationModal
        superDangerous
        open={resetOpen}
        setOpen={setResetOpen}
        title="Reset App Settings"
        negativeText="Cancel"
        affirmativeText="Reset App Settings"
        onAffirmative={settingsMutations.resetAppSettings}
      >
        Are you sure you want to reset all app settings?
      </ConfirmationModal>

      <ConfirmationModal
        superDangerous
        open={recreateOpen}
        setOpen={setRecreateOpen}
        title="Recreate Database"
        negativeText="Cancel"
        affirmativeText="Reset"
        onAffirmative={settingsMutations.reinitializeDatabase}
      >
        Are you sure you want to recreate the database? Note that this process will destroy all
        existing data.
      </ConfirmationModal>

      <ConfirmationModal
        superDangerous
        open={recoverOpen}
        setOpen={setRecoverOpen}
        title="Recover Data from CSV File"
        negativeText="Cancel"
        affirmativeText="Recover"
        onAffirmative={() => settingsMutations.importRunnerCSVFile.mutate()}
      >
        Are you sure you want to recover data from a preexisting Runners file? Note that this will
        overwrite any existing data.
      </ConfirmationModal>
    </Stack>
  );
}
