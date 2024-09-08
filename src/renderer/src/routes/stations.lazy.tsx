import { createLazyFileRoute } from "@tanstack/react-router";
import { StationsPage } from "~/features/StationsPage/StationsPage";

export const Route = createLazyFileRoute("/stations")({
  component: StationsPage
});
