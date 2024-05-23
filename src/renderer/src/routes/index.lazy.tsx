import { createLazyFileRoute } from "@tanstack/react-router";
import { Link } from "~/common/components/Link";

export const Route = createLazyFileRoute("/")({
  component: DocumentationPage
});

function DocumentationPage() {
  return (
    <Link to="https://electron-vite.org/" target="_blank">
      Documentation
    </Link>
  );
}
