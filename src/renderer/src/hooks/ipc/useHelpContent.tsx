import { useQuery } from "@tanstack/react-query";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "../useIpcRenderer";

const HELP_DOCUMENT_PATH = "get-started.md";

export const useHelpDocumentContents = () => {
  const ipcRenderer = useIpcRenderer();
  const { createToast } = useToasts();

  return useQuery({
    queryKey: ["help-document"],
    retry: false,
    queryFn: () => {
      const result = ipcRenderer.invoke("get-resource", HELP_DOCUMENT_PATH);
      if (!result) {
        createToast({ type: "danger", message: "Failed to load help document" });
        throw new Error("Failed to load help document");
      }
      return result;
    }
  });
};
