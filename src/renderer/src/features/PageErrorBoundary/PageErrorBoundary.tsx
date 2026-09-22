import { ReactNode } from "react";
import { CatchBoundary, useRouterState } from "@tanstack/react-router";
import { PageError } from "./PageError";

// Keeps a failed page from blanking the whole window: the sidebar, header and footer stay
// usable, so the operator can navigate away instead of restarting the app mid-event.
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <CatchBoundary
      getResetKey={() => pathname}
      onCatch={(error, errorInfo) => console.error(error, errorInfo.componentStack)}
      errorComponent={PageError}
    >
      {children}
    </CatchBoundary>
  );
}
