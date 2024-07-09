import { createLazyFileRoute } from "@tanstack/react-router";
import { RunnerEntry } from "~/features/RunnerEntry/RunnerEntry";

export const Route = createLazyFileRoute("/")({
  component: RunnerEntry
});
