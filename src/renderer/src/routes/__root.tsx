import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Footer } from "~/features/Footer/Footer";
import { Header } from "~/features/Header/Header";

export const Route = createRootRoute({
  component: () => (
    <>
      <Header />
      <div className="grow">
        <Outlet />
      </div>
      <Footer />
    </>
  )
});
