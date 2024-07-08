import { Button } from "~/components";
import { usePingPongMutation } from "~/hooks/usePingPongMutation";
import { useToasts } from "../Toasts/useToasts";
import { useRunnerLookup } from "~/hooks/useRunnerLookup";

export function SettingsHub() {
  const clickInMutation = usePingPongMutation();
  const { createToast } = useToasts();
  const foundRunner = useRunnerLookup();

  const onClick_Ping = () => {
    createToast({ message: "Runner Lookup", type: "error" });
    clickInMutation.mutate("ping from the renderer!");
  };

  return (
    <div>
      <h1><b>Settings Hub</b></h1>
      <Button onClick={onClick_Ping}>Ping</Button>
      {foundRunner}
    </div>
  );
}
