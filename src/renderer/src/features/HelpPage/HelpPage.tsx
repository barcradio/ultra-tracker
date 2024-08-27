import { RenderMarkdown } from "~/components/RenderMarkdown";
import { useHelpDocumentContents } from "~/hooks/ipc/useHelpContent";

export function HelpPage() {
  const { data } = useHelpDocumentContents();

  return (
    <div className="overflow-y-auto px-4 max-h-inherit bg-component text-on-component">
      <RenderMarkdown trusted>{data}</RenderMarkdown>
    </div>
  );
}
