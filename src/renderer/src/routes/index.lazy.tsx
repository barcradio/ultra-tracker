import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/")({
  component: RunnerTablePage
});

function RunnerTablePage() {
  return <div>Runner Table Page</div>;
}
