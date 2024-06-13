import BarcLogo from "~/assets/barclogo.png";
import { Button, Stack } from "~/components";
import { Stats } from "./Stats";

export function Footer() {
  return (
    <Stack justify="between" align="center" className=" bg-slate-800 p-4 text-slate-100">
      <Stack align="center">
        <Stats />
        <Stack direction="col">
          <Button className="min-w-24">Log</Button>
          <Button className="min-w-24 mt-2">Help</Button>
        </Stack>
      </Stack>

      <img src={BarcLogo} alt="Barc Logo" className="h-4/5 pr-4" />
    </Stack>
  );
}
