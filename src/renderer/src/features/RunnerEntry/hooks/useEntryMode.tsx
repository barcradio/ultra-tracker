import { useStoreValue } from "~/hooks/ipc/useStoreValue";

export function useEntryMode() {
  return useStoreValue("station.entrymode");
}
