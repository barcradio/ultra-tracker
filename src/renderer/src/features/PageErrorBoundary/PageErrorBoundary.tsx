import { ReactNode, useState } from "react";
import { CatchBoundary, useRouterState } from "@tanstack/react-router";
import { PageError } from "./PageError";

// Keeps a failed page from blanking the whole window: the sidebar, header and footer stay
// usable, so the operator can navigate away instead of restarting the app mid-event.
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // CatchBoundary hands its errorComponent only { error, reset }, so the component stack — the
  // part that names the component at fault — has to be captured here and stored to reach the UI.
  const [componentStack, setComponentStack] = useState<string>();

  return (
    <CatchBoundary
      getResetKey={() => pathname}
      onCatch={(error, errorInfo) => {
        console.error(error, errorInfo.componentStack);
        setComponentStack(errorInfo.componentStack ?? undefined);
      }}
      errorComponent={({ error }) => <PageError error={error} componentStack={componentStack} />}
    >
      {children}
    </CatchBoundary>
  );
}
