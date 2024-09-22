import { useEffect, useState } from "react";
import { ipcRenderer } from "electron";
//import { useBasicIpcCall } from "~/hooks/ipc/useBasicIpcCall";
import { RFIDReaderStatus } from "../../../../../shared/enums";

export const useRFIDStatus = (): [RFIDReaderStatus, (status: RFIDReaderStatus) => void] => {
  const [rfidStatus, setRfidStatus] = useState<RFIDReaderStatus>(RFIDReaderStatus.NoDevice);

  // Fetch the RFID status when the hook is used
  useEffect(() => {
    const getRfidStatus = async () => {
      const status = await ipcRenderer.invoke("rfid-get-status");
      setRfidStatus(status); // Update RFID status
    };

    getRfidStatus();
  }, []);

  return [rfidStatus, setRfidStatus];
};
