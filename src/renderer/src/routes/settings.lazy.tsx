import { createLazyFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "~/features/SettingsPage/SettingsPage";

export const Route = createLazyFileRoute("/settings")({
  component: SettingsPage
});
