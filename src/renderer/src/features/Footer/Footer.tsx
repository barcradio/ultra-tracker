import { Tooltip } from "primereact/tooltip";
import BarcLogoDark from "~/assets/barc_dark.svg?react";
import BarcLogoLight from "~/assets/barc_light.svg?react";
import CheckIcon from "~/assets/icons/check-circle.svg?react";
import DangerIcon from "~/assets/icons/error-octagon.svg?react";
import InfoIcon from "~/assets/icons/info-circle.svg?react";
import { Stack } from "~/components";
import { useTheme } from "~/hooks/dom/useTheme";
import { useId } from "~/hooks/useId";
import { ConnectionStatus, useConnectionStatus } from "./hooks/useConnectionStatus";
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
  const connectionStatus = useConnectionStatus();
  const internetTooltipId = useId("internet-status");
  const openSplitTimeTooltipId = useId("opensplittime-status");

  const statusText = (checking: boolean, status: ConnectionStatus["internet"] | undefined) => {
    if (checking) return "Checking...";
    return status === undefined ? "Unknown" : status === "connected" ? "Connected" : "Disconnected";
  };
  const statusFillClass = (checking: boolean, status: ConnectionStatus["internet"] | undefined) => {
    if (checking) return "fill-[#64C6FF]";
    return status === "connected" ? "fill-success" : "fill-danger";
  };
  const statusIcon = (checking: boolean, status: ConnectionStatus["internet"] | undefined) => {
    const className = `${statusFillClass(checking, status)} ${checking ? "animate-pulse" : ""}`;

    if (checking) return <InfoIcon height={18} width={18} className={className} />;
    return status === "connected" ? (
      <CheckIcon height={18} width={18} className={className} />
    ) : (
      <DangerIcon height={18} width={18} className={className} />
    );
  };

  return (
    <Stack
      justify="between"
      align="center"
      className="py-[24px] pl-[16px] m-[16px] text-[18px] shrink-0 bg-component font-display"
    >
      <Stack direction="row" align="center" className="gap-[16px]">
        <Stack direction="col">
          <p className="text-on-component">
            <span className="font-bold">Aid Station</span> - {title}
          </p>
          <p className="text-on-component">
            <span className="font-bold">Operator Call Sign</span> - {callsign}
          </p>
        </Stack>

        <Stack
          direction="col"
          className="gap-[8px] px-[16px] py-[8px] text-[14px] border rounded-md border-component-strong bg-surface-tertiary"
        >
          <Stack id={internetTooltipId} direction="row" align="center" className="gap-[8px]">
            <span className="text-on-component">Internet:</span>
            {statusIcon(connectionStatus.checking, connectionStatus.internet)}
            <Tooltip position="top" target={`#${internetTooltipId}`}>
              {statusText(connectionStatus.checking, connectionStatus.internet)}
            </Tooltip>
          </Stack>
          <Stack id={openSplitTimeTooltipId} direction="row" align="center" className="gap-[8px]">
            <span className="text-on-component">OpenSplitTime:</span>
            {statusIcon(connectionStatus.checking, connectionStatus.openSplitTime)}
            <Tooltip position="top" target={`#${openSplitTimeTooltipId}`}>
              {statusText(connectionStatus.checking, connectionStatus.openSplitTime)}
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>

      {theme === "dark" ? (
        <BarcLogoDark className="pr-4" width="180px" />
      ) : (
        <BarcLogoLight className="pr-4" width="180px" />
      )}
    </Stack>
  );
}
