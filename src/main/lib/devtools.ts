import { BrowserWindow } from "electron";
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";

const extensionOptions = {
  forceDownload: false,
  loadExtensionOptions: { allowFileAccess: true }
} as const;

export async function installDevTools(): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    console.info("Not in development mode, skipping DevTools installation.");
    return;
  }

  try {
    await installExtension(REACT_DEVELOPER_TOOLS, extensionOptions);
    console.info("Added Extension: REACT_DEVELOPER_TOOLS");
  } catch (err) {
    console.warn("An error occurred:", err);
  }
}

export function openDevToolsOnDomReady(window: BrowserWindow): void {
  if (process.env.NODE_ENV !== "development") return;

  window.webContents.once("dom-ready", () => {
    window.webContents.once("devtools-opened", () => {
      window.focus();
    });
  });
}
