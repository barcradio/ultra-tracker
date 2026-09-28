import { BrowserWindow, app, dialog } from "electron";
import { DeviceStatus } from "../../shared/enums";
import { GetRFIDStatus } from "../api/rfid-processor";
import { getAuthStatus } from "../services/opensplittime";

function closeDetail() {
  const lines = ["Your data is saved."];
  if (GetRFIDStatus() === DeviceStatus.Connected)
    lines.push("When Ultra Tracker is opened again, the RFID reader will need to be reconnected.");
  if (getAuthStatus().authenticated)
    lines.push("Reconnect to OpenSplitTime when you reopen the app.");
  return lines.join("\n");
}

export function confirmBeforeClosing(window: BrowserWindow) {
  let quitting = false;
  const allowQuit = () => {
    quitting = true;
  };

  app.on("before-quit", allowQuit);
  window.on("session-end", allowQuit);

  window.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();

    const response = dialog.showMessageBoxSync(window, {
      type: "question",
      title: "Quit Ultra Tracker",
      message: "Are you sure you want to quit Ultra Tracker?",
      detail: closeDetail(),
      buttons: ["Quit", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      noLink: true
    });

    if (response === 0) app.quit();
  });
}
