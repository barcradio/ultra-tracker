import { createLazyFileRoute } from "@tanstack/react-router";
import { ExportPage } from "~/features/ExportPage/ExportPage";

export const Route = createLazyFileRoute("/export")({
  component: ExportPage
});
