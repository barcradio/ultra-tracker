import Markdown, { Options } from "react-markdown";
import rehypeRaw from "rehype-raw";

type Props = Options & {
  trusted?: boolean;
};

export function RenderMarkdown(props: Props) {
  const plugins = props.trusted ? [rehypeRaw] : [];
  return <Markdown {...props} rehypePlugins={plugins} className={`markdown ${props.className}`} />;
}
