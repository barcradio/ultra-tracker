import { Button } from "~/components";
import { UseRunnerLookup } from "~/hooks/useRunnerLookup";
import { useToasts } from "../Toasts/useToasts";

export function SettingsHub() {
  const clickInMutation = UseRunnerLookup();
  const { createToast } = useToasts();

  const onClick_RandomRunner = () => {
    createToast({ message: "Runner Lookup", type: "info" });
    clickInMutation.mutate("ping from the renderer!");
  };

  return (
    <div>
      <h1>
        <b>Settings Hub</b>
      </h1>
      <Button onClick={onClick_RandomRunner}>Random Runner</Button>
    </div>
  );
}
