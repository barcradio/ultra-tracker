import "./assets/main.css";
import { StrictMode, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { PrimeReactProvider } from "primereact/api";
import { createRoot } from "react-dom/client";
import { twMerge } from "tailwind-merge";
import { PrimeReactTheme } from "./lib/primeReactTheme";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  defaultPreload: "intent"
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement?.innerHTML) {
  createRoot(rootElement as HTMLElement).render(
    <StrictMode>
      <PrimeReactProvider
        value={{
          pt: PrimeReactTheme,
          unstyled: true,
          ptOptions: {
            mergeProps: true,
            mergeSections: true,
            classNameMergeFunction: twMerge
          }
        }}
      >
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={null}>
            <RouterProvider router={router} />
          </Suspense>
        </QueryClientProvider>
      </PrimeReactProvider>
    </StrictMode>
  );
}
