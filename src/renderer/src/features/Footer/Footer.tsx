import { useQuery } from "@tanstack/react-query";
import BarcLogoDark from "~/assets/barc_dark.svg?react";
import BarcLogoLight from "~/assets/barc_light.svg?react";
import { Stack } from "~/components";
import { useTheme } from "~/hooks/dom/useTheme";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { useStation } from "../../hooks/data/useStation";

interface ConnectionStatus {
  internet: "connected" | "disconnected";
  openSplitTime: "connected" | "disconnected";
}

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
  const ipcRenderer = useIpcRenderer();
  const { data: connectionStatus } = useQuery({
    queryKey: ["opensplittime-connection-status"],
    queryFn: () =>
      ipcRenderer.invoke("opensplittime-get-connection-status") as Promise<ConnectionStatus>,
    refetchInterval: 30_000
  });

  const statusText = (status: ConnectionStatus["internet"] | undefined) =>
    status === undefined ? "Unknown" : status === "connected" ? "Connected" : "Disconnected";
  const statusClass = (status: ConnectionStatus["internet"] | undefined) =>
    status === "connected"
      ? "text-success"
      : status === "disconnected"
        ? "text-danger"
        : "text-warning";

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

      <Stack direction="col" className="gap-1 px-4 text-sm font-medium">
        <span className={statusClass(connectionStatus?.internet)}>
          Internet: {statusText(connectionStatus?.internet)}
        </span>
        <span className={statusClass(connectionStatus?.openSplitTime)}>
          OpenSplitTime: {statusText(connectionStatus?.openSplitTime)}
        </span>
      </Stack>

      {theme === "dark" ? (
        <BarcLogoDark className="pr-4" width="180px" />
      ) : (
        <BarcLogoLight className="pr-4" width="180px" />
      )}
    </Stack>
  );
}
