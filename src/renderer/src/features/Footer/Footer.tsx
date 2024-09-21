import BarcLogoDark from "~/assets/barc_dark.svg?react";
import BarcLogoLight from "~/assets/barc_light.svg?react";
import { Stack } from "~/components";
import { useTheme } from "~/hooks/dom/useTheme";
import { useStation } from "../../hooks/data/useStation";

function useFooterInfo() {
  const { data: station } = useStation();

  const title = `${station?.identifier.split("-", 1)[0]} ${station?.name}`;
  const operator = Object.values(station?.operators ?? {}).find((operator) => operator.active);
  const callsign = operator ? operator.callsign : "No Active Operator";

  return { title, callsign };
}

export function Footer() {
  const { theme } = useTheme();
  const { title, callsign } = useFooterInfo();

  return (
    <Stack
      justify="between"
      align="center"
      className="py-6 pl-4 m-4 text-lg bg-component font-display"
    >
      <Stack direction="col">
        <p className="text-on-component">
          <span className="font-bold">Aid Station</span> - {title}
        </p>
        <p className="text-on-component">
          <span className="font-bold">Operator Call Sign</span> - {callsign}
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
