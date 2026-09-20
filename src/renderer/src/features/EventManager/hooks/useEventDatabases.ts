import { useQuery } from "@tanstack/react-query";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { EventDatabaseMetadata } from "$shared/models";

export function useEventDatabases(enabled = true) {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["event-databases"],
    enabled,
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

export function useIsEventDatabaseLoaded() {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["is-event-database-loaded"],
    queryFn: async (): Promise<boolean> => {
      return (await ipcRenderer.invoke("is-event-database-loaded")) as boolean;
    }
  });
}

export function useEventDatabaseBackups(enabled = true) {
  const ipcRenderer = useIpcRenderer();

  return useQuery({
    queryKey: ["event-database-backups"],
    enabled,
    queryFn: async (): Promise<EventDatabaseMetadata[]> => {
      const result = (await ipcRenderer.invoke(
        "list-event-database-backups"
      )) as EventDatabaseMetadata[];
      return result || [];
    }
  });
}
