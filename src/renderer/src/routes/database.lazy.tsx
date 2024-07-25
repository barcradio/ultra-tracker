import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/database")({
  component: () => <div>Database</div>
});
