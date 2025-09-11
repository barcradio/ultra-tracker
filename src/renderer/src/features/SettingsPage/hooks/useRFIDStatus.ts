import { useEffect, useState } from "react";
import { DeviceStatus } from "../../../../../shared/enums";
import { RfidSettings } from "../../../../../shared/models";
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
      const status = await ipcRenderer.invoke("rfid:getStatus");
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

export const useRFIDSettings = (): [RfidSettings | null, (s: RfidSettings) => void] => {
  const [rfidSettings, setRfidSettings] = useState<RfidSettings | null>(null);
  const ipcRenderer = useIpcRenderer();

  useEffect(() => {
    const handleSettingsUpdate = (_event: unknown, settings: RfidSettings) => {
      setRfidSettings(settings);
    };

    // Listen for async settings updates from main
    ipcRenderer.on("settings-rfid", handleSettingsUpdate);

    // Fetch initial settings on mount
    const fetchSettings = async () => {
      const settings = await ipcRenderer.invoke("rfid:getSettings");
      setRfidSettings(settings);
    };
    fetchSettings();

    // Cleanup listener
    return () => {
      ipcRenderer.removeAllListeners("settings-rfid");
    };
  }, [ipcRenderer]);

  return [rfidSettings, setRfidSettings];
};
