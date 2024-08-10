import { Button } from "~/components";
import { useRunnerLookup } from "~/hooks/useRunnerLookup";
import { useToasts } from "../Toasts/useToasts";

export function SettingsHub() {
  const clickInMutation = useRunnerLookup();
  const { createToast } = useToasts();

  const fetchRandomRunner = () => {
    createToast({ message: "Runner Lookup", type: "info" });
    clickInMutation.mutate("ping from the renderer!");
  };

  return (
    <div>
      <h1>
        <b>Settings Hub</b>
      </h1>
      <Button onClick={fetchRandomRunner}>Random Runner</Button>
    </div>
  );
}
