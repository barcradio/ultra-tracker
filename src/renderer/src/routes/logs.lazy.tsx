import { createLazyFileRoute } from "@tanstack/react-router";
import { LogsPage } from "~/features/LogsPage/LogsPage";

export const Route = createLazyFileRoute("/logs")({
  component: LogsPage
});
