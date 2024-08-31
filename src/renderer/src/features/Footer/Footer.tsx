import BarcLogoDark from "~/assets/barc_dark.svg?react";
import BarcLogoLight from "~/assets/barc_light.svg?react";
import { Stack } from "~/components";
import { useTheme } from "~/hooks/dom/useTheme";

const useIdentity = () => {
  return {
    aidStation: "12 Ranger Dip",
    callsign: "N8MLS"
  };
};

export function Footer() {
  const { theme } = useTheme();
  const { aidStation, callsign } = useIdentity();

  return (
    <Stack
      justify="between"
      align="center"
      className="py-6 pl-4 m-4 text-lg bg-component font-display"
    >
      <Stack direction="col">
        <p className="text-on-component">
          <span className="font-bold">Aid Station</span> - {aidStation}
        </p>
        <p className="text-on-component">
          <span className="font-bold">Operator Callsign</span> - {callsign}
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
