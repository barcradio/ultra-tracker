import { Button } from "~/components";
import { usePingPongMutation } from "~/hooks/usePingPongMutation";
import { useToasts } from "../Toasts/useToasts";

export function SettingsHub() {
  const clickInMutation = usePingPongMutation();
  const { createToast } = useToasts();

  const handleClick = () => {
    createToast({ message: "Sending ping...", type: "info" });
    clickInMutation.mutate("ping from the renderer!");
  };

  return (
    <div>
      <h1>Settings Hub</h1>
      <Button onClick={handleClick}>Ping</Button>
    </div>
  );
}
