import { Button } from "~/components";
import { useLoadAthletes } from "~/hooks/useLoadAthletes";
import { useToasts } from "../Toasts/useToasts";

export function DBsettingsHub() {
  const clickInMutation = useLoadAthletes();
  const { createToast } = useToasts();

  const getAthletes = () => {
    createToast({ message: "Getting Athletes", type: "info" });
    clickInMutation.mutate("ping from the renderer!");
  };

  return (
    <div>
      <h1>
        <b>DBpane Hub</b>
      </h1>

      <Button color="danger" size="md" onClick={getAthletes}>
        Load Start List
      </Button>
      <Button> Clear Database </Button>
      <Button> Init Database </Button>
    </div>
  );
}
