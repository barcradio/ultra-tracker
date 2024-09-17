import getStartedContents from "~/assets/documents/get-started.md?raw";
import { RenderMarkdown } from "~/components/RenderMarkdown";

export function HelpPage() {
  return (
    <div className="overflow-y-auto px-4 max-h-inherit bg-component text-on-component">
      <RenderMarkdown trusted>{getStartedContents}</RenderMarkdown>
    </div>
  );
}
