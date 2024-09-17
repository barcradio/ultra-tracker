import Markdown, { Options } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

// import remarkGitContributors from "remark-git-contributors";
// import remarkLicense from 'remark-license'
// import remarkToc from "remark-toc";

type Props = Options & {
  trusted?: boolean;
};

export function RenderMarkdown(props: Props) {
  // NOTE: Raw HTML can be dangerous so we only render it when `trusted` is true.
  const htmlPlugins = props.trusted ? [rehypeRaw] : [];
  const markdownPlugins = props.trusted ? [remarkGfm] : [];

  return (
    <Markdown
      {...props}
      remarkPlugins={markdownPlugins}
      rehypePlugins={htmlPlugins}
      className={`markdown ${props.className}`}
    />
  );
}
