import { useQuery } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { DatabaseStatus } from "$shared/enums";
import { EventLogRec } from "$shared/models";
import { useIpcRenderer } from "../useIpcRenderer";

interface Props {
  verbose: boolean;
}

export function useEventLogs(props?: Props) {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useQuery({
    queryKey: ["event-logs"],
    queryFn: async (): Promise<EventLogRec[]> => {
      const response = await ipcRenderer.invoke("get-event-logs", props?.verbose ?? false);
      const [data, status, message] = response;

      if (status != DatabaseStatus.Success) {
        createToast({ type: "danger", message });
        return [];
      }

      return data;
    }
  });
}
