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
        <div className="flex overflow-hidden flex-col ml-[64px] w-screen">
          <Header />
          <div className="mx-4 grow max-h-[calc(100vh-260px)]">
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
