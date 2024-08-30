import Markdown, { Options } from "react-markdown";
import rehypeRaw from "rehype-raw";

type Props = Options & {
  trusted?: boolean;
};

export function RenderMarkdown(props: Props) {
  // NOTE: Raw HTML can be dangerous so we only render it when `trusted` is true.
  const plugins = props.trusted ? [rehypeRaw] : [];
  return <Markdown {...props} rehypePlugins={plugins} className={`markdown ${props.className}`} />;
}
