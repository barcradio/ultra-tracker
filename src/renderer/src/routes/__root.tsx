import { Outlet, createRootRoute } from "@tanstack/react-router";
import { KeyHint } from "~/common/components/KeyHint";
import { Link } from "~/common/components/Link";
import { Logo } from "~/common/components/Logo";
import { Versions } from "~/common/components/Versions";

export const Route = createRootRoute({
  component: () => (
    <>
      <Logo />
      <div className="text-neutral-400 font-semibold leading-4 text-sm mb-2.5">
        Powered by electron-vite
      </div>
      <div className="text-3xl font-bold leading-8 py-4 mx-2.5">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="text-neutral-400 font-semibold leading-6">
        Please try pressing <KeyHint>F12</KeyHint> to open the devTool
      </p>
      <div className="flex pt-8 flex-wrap justify-start mb-4">
        <Link to="/">Goto Documentation</Link>
        <Link to="/ipc">Goto IPC Demo</Link>
      </div>
      <Outlet />
      <Versions />
    </>
  )
});
