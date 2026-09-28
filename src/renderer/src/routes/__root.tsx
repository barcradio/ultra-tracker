import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { AppErrorBoundary } from "~/features/AppErrorBoundary";
import { BackdropProvider } from "~/features/Backdrop";
import { Footer } from "~/features/Footer/Footer";
import { Header } from "~/features/Header/Header";
import { Sidebar } from "~/features/Sidebar/Sidebar";
import { ToastProvider } from "~/features/Toasts/ToastsProvider";
import { useGridFontScaleShortcuts } from "~/hooks/dom/useGridFontScaleShortcuts";

function Root() {
  useGridFontScaleShortcuts();
  const isEntryPage = useRouterState({ select: (state) => state.location.pathname === "/" });

  return (
    <AppErrorBoundary>
      <BackdropProvider>
        <ToastProvider>
          <Sidebar />
          <div className="flex overflow-hidden flex-col ml-[64px] w-screen h-screen">
            <Header />
            <div className="overflow-hidden mx-4 min-h-0 grow">
              <Outlet />
            </div>
            {!isEntryPage && (
              <div className="mx-4 mt-2 mb-2 shrink-0">
                <Footer />
              </div>
            )}
          </div>
        </ToastProvider>
      </BackdropProvider>
    </AppErrorBoundary>
  );
}

export const Route = createRootRoute({
  component: Root
});
