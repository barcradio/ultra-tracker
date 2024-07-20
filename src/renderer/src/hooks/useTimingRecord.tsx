import { useIpcRenderer } from "./useIpcRenderer";

export function useTimingRecord(timingRecord) {
  const ipcRenderer = useIpcRenderer();
  ipcRenderer.invoke("add-timing-record", timingRecord);
}
