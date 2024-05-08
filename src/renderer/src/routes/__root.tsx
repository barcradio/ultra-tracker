import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import electronLogo from "~/assets/electron.svg";
import { Versions } from "~/common/components/Versions";

export const Route = createRootRoute({
  component: () => (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="actions">
        <div className="action">
          <Link to="/">Goto Documentation</Link>
        </div>
        <div className="action">
          <Link to="/ipc">Goto IPC Demo</Link>
        </div>
      </div>
      <div className="actions">
        <Outlet />
      </div>
      <Versions />
    </>
  )
});
