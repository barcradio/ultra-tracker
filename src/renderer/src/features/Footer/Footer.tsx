import BarcLogoDark from "~/assets/barc_dark.svg?react";
import BarcLogoLight from "~/assets/barc_light.svg?react";
import { Stack } from "~/components";
import { useTheme } from "~/hooks/dom/useTheme";
import { useStationIdentity } from "../../hooks/data/useStationIdentity";

export function Footer() {
  const { theme } = useTheme();
  const { data } = useStationIdentity();

  return (
    <Stack
      justify="between"
      align="center"
      className="py-6 pl-4 m-4 text-lg bg-component font-display"
    >
      <Stack direction="col">
        <p className="text-on-component">
          <span className="font-bold">Aid Station</span> - {data?.aidStation}
        </p>
        <p className="text-on-component">
          <span className="font-bold">Operator Callsign</span> - {data?.callsign}
        </p>
      </Stack>

      {theme === "dark" ? (
        <BarcLogoDark className="pr-4" width="180px" />
      ) : (
        <BarcLogoLight className="pr-4" width="180px" />
      )}
    </Stack>
  );
}
