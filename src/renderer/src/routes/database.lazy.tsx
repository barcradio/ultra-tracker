import { createLazyFileRoute } from "@tanstack/react-router";
import { DBsettingsHub } from "~/features/DBsettingsHub/DBsettingsHub";

export const Route = createLazyFileRoute("/database")({
  component: DBsettingsHub
});
