/* eslint-disable no-unused-vars */

import { useEffect, useState } from "react";
import { DeviceStatus } from "../../../../../shared/enums";
import { useIpcRenderer } from "../../../hooks/useIpcRenderer";

export const useRFIDStatus = (): [DeviceStatus, (status: DeviceStatus) => void] => {
  const [rfidStatus, setRfidStatus] = useState<DeviceStatus>(DeviceStatus.NoDevice);
  const ipcRenderer = useIpcRenderer();

  useEffect(() => {
    const fetchRfidStatus = async () => {
      const status = await ipcRenderer.invoke("rfid-get-status");
      setRfidStatus(status);
    };

    const handleStatusUpdate = () => {
      void fetchRfidStatus();
    };

    ipcRenderer.on("status-rfid", handleStatusUpdate);

    void fetchRfidStatus();
    const statusPoll = setInterval(() => void fetchRfidStatus(), 1000);

    return () => {
      clearInterval(statusPoll);
      ipcRenderer.removeListener("status-rfid", handleStatusUpdate);
    };
  }, [ipcRenderer]);

  return [rfidStatus, setRfidStatus];
};
