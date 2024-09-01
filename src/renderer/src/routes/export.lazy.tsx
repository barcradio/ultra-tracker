import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/export")({
  component: () => <div>Hello /export!</div>
});

