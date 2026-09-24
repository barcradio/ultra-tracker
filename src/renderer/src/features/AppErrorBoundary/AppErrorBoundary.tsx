import { ReactNode, useState } from "react";
import { CatchBoundary } from "@tanstack/react-router";
import { AppError } from "./AppError";

// Must sit above the shell: an error in the sidebar, header or footer is otherwise uncaught.
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  // CatchBoundary passes its errorComponent only { error, reset } — never the component stack.
  const [componentStack, setComponentStack] = useState<string>();

  return (
    <CatchBoundary
      getResetKey={() => "app"}
      onCatch={(error, errorInfo) => {
        console.error(error, errorInfo.componentStack);
        setComponentStack(errorInfo.componentStack ?? undefined);
      }}
      errorComponent={({ error }) => <AppError error={error} componentStack={componentStack} />}
    >
      {children}
    </CatchBoundary>
  );
}
