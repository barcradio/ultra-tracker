import BarcLogo from "~/assets/barc.svg";
import { Button, Stack } from "~/components";
import { ButtonLink } from "~/components/ButtonLink";
import { Stats } from "./Stats";

export function Footer() {
  return (
    <Stack justify="between" align="center" className="p-4 m-4 bg-component text-on-surface">
      <Stack align="center">
        <Stats />
        <Stack direction="col">
          <Button className="mt-2 min-w-24">Help</Button>
          <ButtonLink to="/settings" className="mt-2 min-w-24">
            Settings
          </ButtonLink>
        </Stack>
      </Stack>

      <img src={BarcLogo} alt="Barc Logo" className="pr-4" width="280px" />
    </Stack>
  );
}
