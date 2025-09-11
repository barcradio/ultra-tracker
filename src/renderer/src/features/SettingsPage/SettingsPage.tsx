import { useState } from "react";
import { Button, ConfirmationModal, Stack, VerticalButtonGroup } from "~/components";
//import { useStoreValue } from "~/hooks/ipc/useStoreValue";
import { RfidSettings } from "$shared/models";
import { useRfidMutations } from "./hooks/useRFIDMutations";
import { useRFIDSettings, useRFIDStatus } from "./hooks/useRFIDStatus";
import { useSettingsMutations } from "./hooks/useSettingsMutations";
import { DeviceStatus, RfidMode } from "../../../../shared/enums";

function useShouldEnableRFID() {
  //const { data: startline } = useStoreValue("event.startline");
  //const { data: finishline } = useStoreValue("event.finishline");
  //const { data: stationIdentifier } = useStoreValue("station.identifier");

  //if (!startline || !stationIdentifier || !finishline) return true;
  //return startline === stationIdentifier || finishline === stationIdentifier;
  return true;
}

export function SettingsPage() {
  const settingsMutations = useSettingsMutations();
  const [resetOpen, setResetOpen] = useState(false);
  const [recreateOpen, setRecreateOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);

  //used to test RFID
  const testWebRfidSettings: RfidSettings = {
    type: "web",
    restApiUrl: "fxr90c94e1c",
    webSocketUrl: "169.254.78.28",
    websocketPort: 443,
    secureWebsocket: false,
    userName: "admin",
    password: "Bear1002024!",
    sslCert: "fakeCert",
    rfidTagRegx: /0{20}/,
    status: DeviceStatus.Disconnected,
    mode: RfidMode.idle
  };

  const rfidMutations = useRfidMutations();

  const shouldEnableRFID = useShouldEnableRFID();
  const [rfidStatus] = useRFIDStatus();
  const [rfidSettings] = useRFIDSettings();

  const handleRfidButtonClick = () => {
    if (rfidStatus === DeviceStatus.Connected) {
      rfidMutations.disconnectRfid.mutate(undefined);
    } else {
      rfidMutations.initRfid.mutate(testWebRfidSettings);
    }
  };

  const handleRfidStartButtonClick = () => {
    const rfidMode = rfidSettings?.mode;
    if (rfidMode === RfidMode.active) {
      rfidMutations.stopRfid.mutate(undefined);
    } else {
      rfidMutations.startRfid.mutate(undefined);
    }
  };
  const rfidButtonText =
    rfidStatus === DeviceStatus.Connected ? "Disconnect RFID" : "Initialize RFID";
  const rfidStartButtonText = rfidSettings?.mode === RfidMode.active ? "Stop RFID" : "Start RFID";

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
            <Button size="wide" onClick={() => handleRfidStartButtonClick()}>
              {rfidStartButtonText}
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
