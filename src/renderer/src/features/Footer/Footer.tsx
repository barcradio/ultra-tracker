import BarcLogoDark from "~/assets/barc_dark.svg?react";
import BarcLogoLight from "~/assets/barc_light.svg?react";
import { Stack } from "~/components";
import { useTheme } from "~/hooks/dom/useTheme";
import { useStation } from "../../hooks/data/useStation";

export function Footer() {
  const { theme } = useTheme();
  const { data: station } = useStation();

  const stationDisplay = `${station?.identifier.split("-", 1)[0]} ${station?.name}`;

  return (
    <Stack
      justify="between"
      align="center"
      className="py-6 pl-4 m-4 text-lg bg-component font-display"
    >
      <Stack direction="col">
        <p className="text-on-component">
          <span className="font-bold">Aid Station</span> - {stationDisplay}
        </p>
        <p className="text-on-component">
          {/* TODO: Callsign */}
          <span className="font-bold">Operator Callsign</span> - todo callsign
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
