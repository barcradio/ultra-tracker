import { Outlet, createRootRoute } from "@tanstack/react-router";
import { BackdropProvider } from "~/features/Backdrop";
import { Footer } from "~/features/Footer/Footer";
import { Header } from "~/features/Header/Header";
import { Sidebar } from "~/features/Sidebar/Sidebar";
import { ToastProvider } from "~/features/Toasts/ToastsProvider";

export const Route = createRootRoute({
  component: () => (
    <BackdropProvider>
      <ToastProvider>
        <Sidebar />
        <div className="flex overflow-hidden flex-col ml-16 w-screen h-screen">
          <Header />
          <div className="overflow-hidden mx-4 min-h-0 grow">
            <Outlet />
          </div>
          <Footer />
        </div>
      </ToastProvider>
    </BackdropProvider>
  )
});
