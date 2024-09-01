import { useQuery } from "@tanstack/react-query";
import { EventLogRec } from "$shared/models";
import { useHandleErrorToasts } from "../useHandleErrors";
import { useIpcRenderer } from "../useIpcRenderer";

interface Props {
  verbose: boolean;
}

export function useEventLogs(props?: Props) {
  const ipcRenderer = useIpcRenderer();
  const handleErrors = useHandleErrorToasts();

  return useQuery({
    queryKey: ["event-logs"],
    queryFn: async (): Promise<EventLogRec[]> => {
      const response = await ipcRenderer.invoke("get-event-logs", props?.verbose ?? false);
      const [data, status, message] = response;
      const success = handleErrors(status, message);
      return success ? data : [];
    }
  });
}
