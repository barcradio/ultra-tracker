import { useQuery } from "@tanstack/react-query";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { EventDatabaseMetadata } from "$shared/models";

export function useEventDatabases() {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["event-databases"],
    queryFn: async (): Promise<EventDatabaseMetadata[]> => {
      const result = (await ipcRenderer.invoke("list-event-databases")) as EventDatabaseMetadata[];
      return result || [];
    }
  });
}

export function useActiveDatabaseSlug() {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["active-database-slug"],
    queryFn: async (): Promise<string | null> => {
      const slug = (await ipcRenderer.invoke("get-store-value", "event.activeDatabaseSlug")) as
        string | null;
      return slug ?? null;
    }
  });
}
