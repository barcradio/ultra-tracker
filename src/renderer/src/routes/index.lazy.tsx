import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/")({
  component: DocumentationPage
});

function DocumentationPage() {
  return (
    <div className="action">
      <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
        Documentation
      </a>
    </div>
  );
}
