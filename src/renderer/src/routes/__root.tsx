import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Footer } from "~/features/Footer/Footer";
import { Header } from "~/features/Header/Header";
import { Sidebar } from "~/features/Sidebar/Sidebar";
import { ToastProvider } from "~/features/Toasts/ToastsProvider";

export const Route = createRootRoute({
  component: () => (
    <ToastProvider>
      <Sidebar />
      <div className="flex flex-col w-screen">
        <Header />
        <div className="mx-4 grow">
          <Outlet />
        </div>
        <Footer />
      </div>
    </ToastProvider>
  )
});
