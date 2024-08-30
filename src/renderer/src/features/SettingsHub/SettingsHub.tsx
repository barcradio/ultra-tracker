import { Button, Stack } from "~/components";
import { useRunnerLookup } from "~/hooks/data/useRunnerLookup";
import * as settingsHooks from "~/hooks/ipc/useSettingsUtilities";
import { useToasts } from "../Toasts/useToasts";

export function SettingsHub() {
  const resetAppSettingsMutation = settingsHooks.useResetAppSettings();
  const clickInMutation = useRunnerLookup();
  const { createToast } = useToasts();

  const resetAppSettings = () => {
    createToast({ message: "App Settings: Resetting", type: "info" });
    resetAppSettingsMutation.mutate("resetAppSettings");
  };

  const fetchRandomRunner = () => {
    createToast({ message: "Runner Lookup", type: "info" });
    clickInMutation.mutate("ping from the renderer!");
  };

  return (
    <div>
      <h1>
        <b>Settings Hub</b>
      </h1>
      <Stack direction="row" align="stretch">
        <Stack direction="col">
          <b>Sandbox</b>
          <Button onClick={fetchRandomRunner}>Random Runner</Button>
        </Stack>
        <Stack direction="col">
          <b>App Settings</b>
          <Button color="warning" variant="outlined" onClick={resetAppSettings}>
            Reset App Settings
          </Button>
        </Stack>
      </Stack>
    </div>
  );
}
