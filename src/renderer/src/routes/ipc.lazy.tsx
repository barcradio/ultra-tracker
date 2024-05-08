import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/ipc")({
  component: IpcPage
});

function IpcPage() {
  const ipcHandle = (): void => window.electron.ipcRenderer.send("ping");

  return (
    <div className="action">
      <button type="button" onClick={ipcHandle}>
        Send IPC
      </button>
    </div>
  );
}
