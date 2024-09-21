import Markdown, { Options } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";

type Props = Options & {
  trusted?: boolean;
};

export function RenderMarkdown(props: Props) {
  // NOTE: Raw HTML can be dangerous so we only render it when `trusted` is true.
  const htmlPlugins = props.trusted ? [rehypeRaw] : [];
  const markdownPlugins = props.trusted
    ? [
        remarkGfm,
        [remarkToc, { heading: "Table of Contents", maxDepth: 5, tight: true, ordered: true }]
      ]
    : [];

  return (
    <Markdown
      {...props}
      // @ts-expect-error some odd quirk with remark plugins and typescript and declaring their options objects
      remarkPlugins={markdownPlugins}
      rehypePlugins={htmlPlugins}
      className={`markdown ${props.className}`}
    />
  );
}
