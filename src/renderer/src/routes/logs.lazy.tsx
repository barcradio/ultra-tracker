import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/logs")({
  component: () => <div>Logs</div>
});
