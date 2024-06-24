import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Footer } from "~/features/Footer/Footer";
import { Header } from "~/features/Header/Header";
import { ToastProvider } from "~/features/Toasts/ToastsProvider";

export const Route = createRootRoute({
  component: () => (
    <ToastProvider>
      <Header />
      <div className="grow">
        <Outlet />
      </div>
      <Footer />
    </ToastProvider>
  )
});
