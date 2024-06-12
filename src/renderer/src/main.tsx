import "./assets/main.css";
import { StrictMode, Suspense } from "react";
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";

const hashHistory = createHashHistory();
const router = createRouter({ routeTree, history: hashHistory });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement?.innerHTML) {
  createRoot(rootElement as HTMLElement).render(
    <StrictMode>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </StrictMode>
  );
}
