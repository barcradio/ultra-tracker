import { createLazyFileRoute } from "@tanstack/react-router";
import { SearchPage } from "~/features/SearchPage/SearchPage";

export const Route = createLazyFileRoute("/search")({
  component: () => <SearchPage />
});
