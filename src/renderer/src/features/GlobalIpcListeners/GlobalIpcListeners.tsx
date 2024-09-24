import { useToastOnRFIDStatus } from "~/hooks/ipc/useToastOnRFIDStatus";

export function GlobalIpcListeners() {
  useToastOnRFIDStatus();

  return null;
}
