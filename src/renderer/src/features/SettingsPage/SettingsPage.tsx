import { useState } from "react";
import { Button, ConfirmationModal, Stack, VerticalButtonGroup } from "~/components";
import { useGridFontScale } from "~/hooks/dom/useGridFontScale";
import { useFastModeInOutButton } from "~/hooks/useFastModeInOutButton";
import { useSettingsMutations } from "./hooks/useSettingsMutations";
import { OpenSplitTimeLogin } from "./OpenSplitTimeLogin";
import { RfidConfiguration } from "./RfidConfiguration";

export function SettingsPage() {
  const settingsMutations = useSettingsMutations();
  const gridFontScale = useGridFontScale();
  const fastModeInOutButton = useFastModeInOutButton();
  const [resetOpen, setResetOpen] = useState(false);
  const [recreateOpen, setRecreateOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);

  return (
    <div className="w-full h-full overflow-y-auto bg-component p-6">
      <Stack justify="center" align="start" className="gap-6 flex-wrap xl:flex-nowrap min-w-full">
        {/* Event Settings */}
        <Stack direction="col" className="w-[22rem] gap-4" align="stretch">
          <VerticalButtonGroup label="Event Settings">
            <Button size="wide" onClick={() => settingsMutations.importStationsFile.mutate()}>
              Load Stations File
            </Button>
            <Button size="wide" onClick={() => settingsMutations.importAthletesFile.mutate()}>
              Load Athletes File
            </Button>
            <Button size="wide" onClick={() => settingsMutations.importDropsFile.mutate()}>
              Load Drops File
            </Button>
          </VerticalButtonGroup>
           <div className="border-t border-component-strong pt-4">
            <RfidConfiguration />
          </div>
        </Stack>

        {/* Integration Settings */}
        <Stack direction="col" className="w-[22rem] gap-4" align="stretch">
          <OpenSplitTimeLogin className="w-full" />

        </Stack>

        {/* User Settings + Developer Tools */}
        <Stack direction="col" className="w-[22rem] gap-4" align="stretch">
          <VerticalButtonGroup label="User Settings">
            <Stack align="center" className="gap-3">
              <Button size="md" onClick={gridFontScale.decrease}>
                A-
              </Button>
              <span className="w-16 text-center font-display text-on-surface-strong">
                {Math.round(gridFontScale.scale * 100)}%
              </span>
              <Button size="md" onClick={gridFontScale.increase}>
                A+
              </Button>
            </Stack>
            <Button size="wide" onClick={gridFontScale.reset}>
              Reset Grid Text Size
            </Button>
            <p className="w-80 text-on-surface-strong italic font-display text-sm mt-2">
              Adjusts text size in data grids. You can also use Ctrl/Cmd + = / - / 0.
            </p>
            <label className="flex items-center gap-2 w-80 text-on-surface-strong font-display">
              <input
                type="checkbox"
                checked={fastModeInOutButton.enabled}
                onChange={(event) => fastModeInOutButton.setEnabled(event.target.checked)}
                className="w-5 h-5 accent-primary"
              />
              Show +/- button in Fast mode
            </label>
          </VerticalButtonGroup>

          <VerticalButtonGroup label="Developer Tools" className="border-2 border-danger/30">
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

          <VerticalButtonGroup label="App Settings">
            <Button color="danger" onClick={() => setResetOpen(true)} size="wide">
              Reset App Settings
            </Button>
          </VerticalButtonGroup>
        </Stack>
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
    </div>
  );
}
