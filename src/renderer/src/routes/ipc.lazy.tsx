import { createLazyFileRoute } from "@tanstack/react-router";
import { Button } from "~/common/components/Button";

export const Route = createLazyFileRoute("/ipc")({
  component: IpcPage
});

function IpcPage() {
  const ipcHandle = (): void => window.electron.ipcRenderer.send("ping");

  return <Button onClick={ipcHandle}>Send IPC</Button>;
}
