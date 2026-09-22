import { Button } from "~/components/Button";
import { Stack } from "~/components/Stack";

export function PageError({ error }: { error: Error }) {
  return (
    <Stack
      className="gap-4 justify-center items-center h-full text-on-component"
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
    </Stack>
  );
}
