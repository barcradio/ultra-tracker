import { Outlet, createRootRoute } from "@tanstack/react-router";
import { BackdropProvider } from "~/features/Backdrop/BackdropContext";
import { Footer } from "~/features/Footer/Footer";
import { Header } from "~/features/Header/Header";
import { Sidebar } from "~/features/Sidebar/Sidebar";
import { ToastProvider } from "~/features/Toasts/ToastsProvider";

export const Route = createRootRoute({
  component: () => (
    <BackdropProvider>
      <ToastProvider>
        <Sidebar />
        <div className="flex overflow-hidden flex-col ml-16 w-screen">
          <Header />
          <div className="mx-4 grow max-h-[calc(100vh-260px)]">
            <Outlet />
          </div>
          <Footer />
        </div>
      </ToastProvider>
    </BackdropProvider>
  )
});
