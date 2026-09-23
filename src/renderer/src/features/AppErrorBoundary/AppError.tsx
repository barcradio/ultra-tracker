import { useEffect, useState } from "react";
import { Button } from "~/components/Button";
import { Stack } from "~/components/Stack";

export function AppError({ error, componentStack }: { error: Error; componentStack?: string }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  // error.stack already begins with "Name: message", so it is not repeated.
  const report = [error.stack ?? `${error.name}: ${error.message}`, componentStack]
    .filter(Boolean)
    .join("\n\n");

  useEffect(() => {
    if (copied !== "copied") return;

    const timer = setTimeout(() => setCopied("idle"), 2500);

    return () => clearTimeout(timer);
  }, [copied]);

  // The clipboard is rejected when the document is not focused, so a copy can genuinely fail.
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
      className="gap-4 justify-center items-center px-4 w-screen h-screen bg-surface-low text-on-component"
      direction="col"
      role="alert"
    >
      <span className="text-xl font-bold font-display">Ultra Tracker stopped responding</span>
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
        <pre className="overflow-auto p-2 mt-2 max-h-64 font-mono text-xs whitespace-pre-wrap rounded select-text bg-component-strong">
          {report}
        </pre>
        <Stack className="gap-3 items-center mt-2" direction="row">
          <Button color="neutral" variant="outlined" size="sm" onClick={copy}>
            Copy
          </Button>
          {copied !== "idle" && (
            <span className="text-sm opacity-70">
              {copied === "copied" ? "Copied" : "Could not copy — select the text above instead"}
            </span>
          )}
        </Stack>
      </details>
    </Stack>
  );
}
