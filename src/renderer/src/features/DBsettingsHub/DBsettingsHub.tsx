import { Button } from "~/components";
import { useLoadAthletes } from "~/hooks/useLoadAthletes";

// import { useToasts } from "../Toasts/useToasts";

// import { UseRunnerLookup } from "~/hooks/useRunnerLookup";

export function DBsettingsHub() {
    const AthletesMutation = useLoadAthletes();
//   const { createToast } = useToasts();

//   const onClick_Athletes = () => {
//     createToast({ message: "Athletesload", type: "info" });
//     clickInMutation.mutate("ping from the renderer!");
//   };
    const Athletesload = () => {
        AthletesMutation.mutate("Random string");
    }
  return (
    <div>
      <h1>
        <b>DBpane Hub</b>
      </h1>
      
      <Button color="danger" size="md" onClick={Athletesload }>Load Start List</Button>
      <Button> Clear Database </Button>
      <Button> Init Database </Button>
    </div>
  );
}
