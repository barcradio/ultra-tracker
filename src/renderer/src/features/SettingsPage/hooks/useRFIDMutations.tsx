import { useRfidIpcCall } from "~/hooks/ipc/rfidIpcCall";

export function useRfidMutations() {
  // Initialize (requires settings)
  const initRfid = useRfidIpcCall("rfid:initialize", {
    preToast: "Connecting to RFID reader..."
  });

  // Start (no payload)
  const startRfid = useRfidIpcCall("rfid:start", { preToast: "Starting scan..." });

  // Stop (no payload)
  const stopRfid = useRfidIpcCall("rfid:stop");

  // Disconnect (no payload)
  const disconnectRfid = useRfidIpcCall("rfid:disconnect", { successToastType: "info" });

  return {
    initRfid,
    startRfid,
    stopRfid,
    disconnectRfid
  };
}
