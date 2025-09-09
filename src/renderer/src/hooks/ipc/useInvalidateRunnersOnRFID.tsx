import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIpcRenderer } from "../useIpcRenderer";

export function useInvalidateRunnersOnRFID() {
  const queryClient = useQueryClient();
  const ipcRenderer = useIpcRenderer();

  useEffect(() => {
    const handleRFIDRead = () => {
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
      queryClient.invalidateQueries({ queryKey: ["stats-table"] });
    };

    ipcRenderer.on("read-rfid", handleRFIDRead);

    // Cleanup function
    return () => {
      ipcRenderer.removeAllListeners("read-rfid");
    };
  }, [ipcRenderer, queryClient]);
}
