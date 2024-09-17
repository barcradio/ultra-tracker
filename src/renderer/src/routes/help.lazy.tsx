import { createLazyFileRoute } from "@tanstack/react-router";
import { HelpPage } from "~/features/HelpPage/HelpPage";

export const Route = createLazyFileRoute("/help")({
  component: HelpPage
});
