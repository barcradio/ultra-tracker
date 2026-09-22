import { useEffect, useState } from "react";
import { Button } from "~/components/Button";
import { Stack } from "~/components/Stack";

type CopyState = "idle" | "copied" | "failed";

function buildReport(error: Error, componentStack?: string) {
  // error.stack already opens with "Name: message", so it is not repeated here.
  return [
    error.stack ?? `${error.name}: ${error.message}`,
    componentStack ? `Component stack:${componentStack}` : "(no component stack)"
  ].join("\n\n");
}

export function PageError({ error, componentStack }: { error: Error; componentStack?: string }) {
  const [copied, setCopied] = useState<CopyState>("idle");
  const report = buildReport(error, componentStack);

  useEffect(() => {
    if (copied !== "copied") return;

    const timer = setTimeout(() => setCopied("idle"), 2500);

    return () => clearTimeout(timer);
  }, [copied]);

  // Clipboard access is rejected when the document is not focused, so a failure is reported
  // rather than swallowed: the operator can still select the text by hand.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <Stack
      className="gap-4 justify-center items-center px-4 h-full text-on-component"
      direction="col"
      role="alert"
    >
      <span className="text-xl font-bold font-display">This page stopped responding</span>
      <span className="max-w-prose text-center">
        Your recorded times are safe. Reload to get back to work.
      </span>
      <span className="max-w-prose font-mono text-sm text-center opacity-70">{error.message}</span>
      <Button color="primary" variant="solid" size="md" onClick={() => window.location.reload()}>
        Reload
      </Button>
      <details className="w-full max-w-3xl">
        <summary className="text-sm text-center cursor-pointer opacity-70 select-none">
          More details
        </summary>
        <Stack className="gap-2 mt-2" direction="col" align="stretch">
          <pre className="overflow-auto p-2 max-h-64 font-mono text-xs whitespace-pre-wrap rounded bg-component-strong">
            {report}
          </pre>
          <Stack className="gap-3 items-center" direction="row">
            <Button color="neutral" variant="outlined" size="sm" onClick={copy}>
              Copy
            </Button>
            {copied === "copied" && <span className="text-sm opacity-70">Copied</span>}
            {copied === "failed" && (
              <span className="text-sm opacity-70">
                Could not copy — select the text above instead
              </span>
            )}
          </Stack>
        </Stack>
      </details>
    </Stack>
  );
}
