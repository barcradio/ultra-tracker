import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { DatabaseStatus } from "$shared/enums";
import { DatabaseResponse } from "$shared/types";

export function useLoadEventDatabase() {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: async (slug: string): Promise<DatabaseResponse> => {
      return (await ipcRenderer.invoke("load-event-database", slug)) as DatabaseResponse;
    },
    onError: (error) => {
      createToast({
        message: error instanceof Error ? error.message : "Failed to load event database",
        type: "danger"
      });
    }
  });
}

export function useDeleteEventDatabase() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const { createToast } = useToasts();

  return useMutation({
    mutationFn: async (slug: string): Promise<DatabaseResponse> => {
      return (await ipcRenderer.invoke("delete-event-database", slug)) as DatabaseResponse;
    },
    onSuccess: (data) => {
      const [status, message] = data;
      if (status === DatabaseStatus.Deleted) {
        createToast({ message: message || "Event database deleted", type: "success" });
        queryClient.invalidateQueries({ queryKey: ["event-databases"] });
      } else {
        createToast({ message: message || "Failed to delete event database", type: "danger" });
      }
    },
    onError: (error) => {
      createToast({
        message: error instanceof Error ? error.message : "Failed to delete event database",
        type: "danger"
      });
    }
  });
}
