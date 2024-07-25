import { useMutation } from "@tanstack/react-query";
import { TimingRecord } from "$shared/models";
import { useIpcRenderer } from "./useIpcRenderer";

export function useCreateTiming() {
  const ipcRenderer = useIpcRenderer();
  return useMutation({
    mutationFn: (timingRecord: TimingRecord) => {
      return ipcRenderer.invoke("add-timing-record", timingRecord);
    }
  });
}
