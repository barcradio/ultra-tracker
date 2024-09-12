import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIpcRenderer } from "../useIpcRenderer";

export function useInvalidateRunnersOnRFID() {
  const queryClient = useQueryClient();
  const ipcRenderer = useIpcRenderer();

  // Only attach the ipc handler on the first render
  useEffect(() => {
    ipcRenderer.on("read-rfid", () => {
      queryClient.invalidateQueries({ queryKey: ["runners-table"] });
    });
  }, [ipcRenderer, queryClient]);
}
