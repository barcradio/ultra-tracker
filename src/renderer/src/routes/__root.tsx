import { Outlet, createRootRoute } from "@tanstack/react-router";
import { BackdropProvider } from "~/features/Backdrop";
import { Footer } from "~/features/Footer/Footer";
import { Header } from "~/features/Header/Header";
import { Sidebar } from "~/features/Sidebar/Sidebar";
import { ToastProvider } from "~/features/Toasts/ToastsProvider";
import { useGridFontScaleShortcuts } from "~/hooks/dom/useGridFontScaleShortcuts";

function Root() {
  useGridFontScaleShortcuts();

  return (
    <BackdropProvider>
      <ToastProvider>
        <Sidebar />
        <div className="flex overflow-hidden flex-col ml-[64px] w-screen h-screen">
          <Header />
          <div className="overflow-hidden mx-4 min-h-0 grow">
            <Outlet />
          </div>
          <Footer />
        </div>
      </ToastProvider>
    </BackdropProvider>
  );
}

export const Route = createRootRoute({
  component: Root
});
