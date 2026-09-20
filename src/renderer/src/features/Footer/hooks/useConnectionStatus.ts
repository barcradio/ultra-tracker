import { useEffect, useState } from "react";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

export interface ConnectionStatus {
  internet: "connected" | "disconnected";
  openSplitTime: "connected" | "disconnected";
  checking: boolean;
}

const initialStatus: ConnectionStatus = {
  internet: "disconnected",
  openSplitTime: "disconnected",
  checking: true
};

export const useConnectionStatus = (): ConnectionStatus => {
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const ipcRenderer = useIpcRenderer();

  useEffect(() => {
    const handleStatusUpdate = (_event, updated: ConnectionStatus) => {
      setStatus(updated);
    };

    ipcRenderer.on("status-opensplittime-connection", handleStatusUpdate);

    const fetchInitialStatus = async () => {
      const current = await ipcRenderer.invoke("opensplittime-get-connection-status");
      setStatus(current);
    };
    fetchInitialStatus();

    // Browser online/offline events fire promptly on OS-level network changes; use them to
    // shortcut detection latency instead of waiting for the next poll interval.
    const handleNetworkChange = () => {
      ipcRenderer.invoke("opensplittime-recheck-connection");
    };
    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);

    return () => {
      ipcRenderer.removeAllListeners("status-opensplittime-connection");
      window.removeEventListener("online", handleNetworkChange);
      window.removeEventListener("offline", handleNetworkChange);
    };
  }, [ipcRenderer]);

  return status;
};
