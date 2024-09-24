import { createFileRoute } from "@tanstack/react-router";
import { RosterPage } from "~/features/RosterPage/RosterPage";

export interface BibIdFilter {
  firstName?: string;
  lastName?: string;
}

export const Route = createFileRoute("/roster")({
  component: () => <RosterPage />,
  validateSearch: (searchParams: Record<string, string>): BibIdFilter => {
    return { firstName: searchParams.firstName ?? "", lastName: searchParams.lastName ?? "" };
  }
});
