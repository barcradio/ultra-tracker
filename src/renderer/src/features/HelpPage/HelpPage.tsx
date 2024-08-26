import Markdown from "react-markdown";
import { useHelpDocumentContents } from "~/hooks/ipc/useHelpContent";

export function HelpPage() {
  const { data } = useHelpDocumentContents();

  return (
    <div className="overflow-y-auto max-h-inherit">
      <Markdown className="markdown">{data}</Markdown>
    </div>
  );
}
