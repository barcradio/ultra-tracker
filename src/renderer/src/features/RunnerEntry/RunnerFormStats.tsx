import { useState } from "react";
import { Button, Stack, TextInput } from "~/components";
import { Stats } from "./Stats";
import { useToasts } from "../Toasts/useToasts";

export function RunnerFormStats() {
  const [bibNumber, setBibNumber] = useState(0);
  const { createToast } = useToasts();

  const handleIn = () =>
    createToast({ message: `Runner ${bibNumber} has entered the aid station`, type: "success" });

  const handleOut = () =>
    createToast({ message: `Runner ${bibNumber} has exited the aid station`, type: "success" });

  return (
    <Stack direction="col" align="stretch" className="mr-4 w-1/5">
      <TextInput
        onChange={(e) => setBibNumber(parseInt(e.target.value))}
        className="h-32 text-center border-component"
        placeholder="BIB#"
        size="xl"
        type="number"
      />
      <Stack direction="row" align="stretch" className="mt-2 mb-4 w-full h-12" justify="stretch">
        <Button variant="solid" color="success" className="mr-1 w-1/2" onClick={handleIn}>
          In
        </Button>
        <Button variant="solid" color="danger" className="ml-1 w-1/2" onClick={handleOut}>
          Out
        </Button>
      </Stack>
      <div className="w-full grow bg-component">
        <Stats />
      </div>
    </Stack>
  );
}
