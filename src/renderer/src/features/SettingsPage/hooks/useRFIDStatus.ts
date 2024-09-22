import { useEffect, useState } from "react";
import { DeviceStatus } from "../../../../../shared/enums";
import { useIpcRenderer } from "../../../hooks/useIpcRenderer";

export const useRFIDStatus = (): [DeviceStatus, (status: DeviceStatus) => void] => {
  const [rfidStatus, setRfidStatus] = useState<DeviceStatus>(DeviceStatus.NoDevice);
  const ipcRenderer = useIpcRenderer();

  useEffect(() => {
    const handleStatusUpdate = (_event, status: DeviceStatus) => {
      setRfidStatus(status); // Update the state whenever a status update is received
    };

    ipcRenderer.on("status-rfid", handleStatusUpdate);

    // Fetch the initial RFID status on mount
    const fetchRfidStatus = async () => {
      const status = await ipcRenderer.invoke("rfid-get-status");
      setRfidStatus(status);
    };
    fetchRfidStatus();

    // Cleanup the listener when the component unmounts
    return () => {
      ipcRenderer.removeAllListeners("status-rfid");
    };
  }, [ipcRenderer]);

  return [rfidStatus, setRfidStatus];
};
