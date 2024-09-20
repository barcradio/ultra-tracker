import { useIpcRenderer } from "~/hooks/useIpcRenderer";

export function useMainLogger(level: string, message: string) {
  const ipcRenderer = useIpcRenderer();

  ipcRenderer.send("__ELECTRON_LOG__", {
    // LogMessage-like object
    data: [message],
    level: level,
    variables: { processType: "renderer" }
    // ... some other optional fields like scope, logId and so on
  });
}
