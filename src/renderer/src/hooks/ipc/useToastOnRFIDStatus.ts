import { useEffect } from "react";
import { DeviceStatus } from "../../../../shared/enums";
import { useToasts } from "../../features/Toasts/useToasts";
import { useIpcRenderer } from "../useIpcRenderer";

export function useToastOnRFIDStatus() {
  const ipcRenderer = useIpcRenderer(); // Custom hook for ipcRenderer
  const { createToast } = useToasts();  // Custom hook for toasts

  useEffect(() => {
    // Handler function for RFID status
    const handleRFIDStatus = (
      _event: Electron.IpcRendererEvent,
      status: DeviceStatus,
      message: string
    ) => {
      let toastType: "info" | "success" | "danger" = "info";
      let timeoutMs: number | undefined = undefined; // Default timeout

      switch (status) {
        case DeviceStatus.Connected:
          toastType = "success";
          break;
        case DeviceStatus.Error:
        case DeviceStatus.NoDevice:
          toastType = "danger";
          timeoutMs = -1; // Keep toast until manually dismissed
          break;
        default:
          toastType = "info";
      }

      // Show toast based on the received status
      createToast({
        message: message,
        type: toastType,
        timeoutMs: timeoutMs,
      });
    };

    // Register the IPC listener for 'status-rfid' event
    ipcRenderer.on("status-rfid", handleRFIDStatus);

    // Cleanup: remove the listener when the component is unmounted
    return () => {
      ipcRenderer.removeAllListeners("status-rfid");
    };
  }, [createToast, ipcRenderer]);
}
