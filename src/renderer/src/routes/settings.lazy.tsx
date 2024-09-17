import { createLazyFileRoute } from "@tanstack/react-router";
import { SettingsHub } from "~/features/SettingsHub/SettingsHub";

export const Route = createLazyFileRoute("/settings")({
  component: SettingsHub
});
