import { createLazyFileRoute } from "@tanstack/react-router";
import { RosterPage } from "~/features/RosterPage/RosterPage";

export const Route = createLazyFileRoute("/roster")({
  component: () => <RosterPage />
});
