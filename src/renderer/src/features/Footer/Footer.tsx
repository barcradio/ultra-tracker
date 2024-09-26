import BarcLogoDark from "~/assets/barc_dark.svg?react";
import BarcLogoLight from "~/assets/barc_light.svg?react";
import { Stack } from "~/components";
import { useTheme } from "~/hooks/dom/useTheme";
import { useStation } from "../../hooks/data/useStation";
import { useAppInfo } from "../../hooks/useAppInfo";

function useFooterInfo() {
  const { data: station } = useStation();
  const { data: version } = useAppInfo();

  const title = `${station?.identifier.split("-", 1)[0]} ${station?.name}`;
  const operator = Object.values(station?.operators ?? {}).find((operator) => operator.active);
  const callsign = operator ? operator.callsign : "No Active Operator";
  const appVersion = version ? `v${version}` : "";

  return { title, callsign, appVersion };
}

export function Footer() {
  const { theme } = useTheme();
  const { title, callsign, appVersion } = useFooterInfo();

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

      <Stack
        justify="between"
        align="center"
        className="py-6 pl-4 m-4 text-lg bg-component font-display"
      >
        <p className="text-on-component">
          <span>{appVersion}</span>
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
