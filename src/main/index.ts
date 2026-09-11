import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, Event, Menu, app, dialog, powerMonitor, shell } from "electron";
import iconLinux from "$resources/iconLinux.png?asset";
import { DisconnectRFIDReader, RecoverRFIDReader } from "./api/rfid-processor";
import {
  adoptLegacyDatabaseIfPresent,
  closeActiveConnection,
  getDatabaseConnection,
  isDatabaseConnected,
  listEventDatabaseSlugs,
  switchToDatabase
} from "./database/connect-db";
import { validateDatabaseTables } from "./database/tables-db";
import { initializeIpcHandlers } from "./ipc/init-ipc";
import { installDevTools, openDevToolsOnDomReady } from "./lib/devtools";
import { initUserDirectories } from "./lib/file-dialogs";
import { LogLevel, initialize, shutdown, uberLog } from "./lib/logger";
import { initStatEngine } from "./lib/stat-engine";
import { appStore } from "./lib/store";

let mainWindow: BrowserWindow | null = null;

// Drop the default zoom accelerators (they conflict with the app's own grid font scale shortcuts)
// while keeping reload/devtools/fullscreen available.
function setApplicationMenu(): void {
  const isMac = process.platform === "darwin";

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(isMac ? [{ role: "appMenu" as const }] : []),
      { role: "editMenu" },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "togglefullscreen" }
        ]
      },
      { role: "windowMenu" }
    ])
  );
}

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1080,
    minWidth: 775,
    minHeight: 600,
    backgroundColor: "#0D1519",
    show: false,
    autoHideMenuBar: true,
    // setting or title here doesn't seem to work
    //...(process.platform === "linux" ? { iconLinux } : {}),
    //...(process.platform === "win32" ? { iconWin } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  let rendererCrashDialogOpen = false;

  mainWindow!.once("ready-to-show", () => {
    uberLog(LogLevel.info, "ui", "Main window ready to show", false);
    mainWindow!.show();
    mainWindow!.focus();
    mainWindow!.setTitle(`${app.name} - v${app.getVersion()}`);
    mainWindow!.setIcon(iconLinux);
  });

  mainWindow!.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  mainWindow!.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow!.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow!.webContents.on("render-process-gone", (_event, details) => {
    if (rendererCrashDialogOpen || mainWindow!.isDestroyed()) return;

    rendererCrashDialogOpen = true;
    const reloadShortcut = process.platform === "darwin" ? "Cmd+R" : "Ctrl+R";
    const forceReloadShortcut = process.platform === "darwin" ? "Cmd+Shift+R" : "Ctrl+Shift+R";

    void dialog
      .showMessageBox(mainWindow!, {
        type: "error",
        title: "Ultra-Tracker renderer stopped",
        message: "The application window encountered an error and needs to be reloaded.",
        detail: `Try Reload (${reloadShortcut}) first. If the problem continues, try Force Reload (${forceReloadShortcut}).\n\nReason: ${details.reason}`,
        buttons: ["Reload", "Force Reload", "Close"],
        defaultId: 0,
        cancelId: 2,
        noLink: true
      })
      .then(({ response }) => {
        if (mainWindow!.isDestroyed()) return;
        if (response === 0) mainWindow!.reload();
        if (response === 1) mainWindow!.webContents.reloadIgnoringCache();
      })
      .finally(() => {
        rendererCrashDialogOpen = false;
      });
  });

  return mainWindow;
}

async function initializeApp(): Promise<void> {
  uberLog(LogLevel.info, "startup", "Application execution path:" + app.getAppPath(), false);

  electronApp.setAppUserModelId("com.electron");

  setApplicationMenu();

  createWindow();

  if (!mainWindow) return;

  await installDevTools();

  initialize();
  initUserDirectories();
  adoptLegacyDatabaseIfPresent();
  const activeDatabaseSlug = appStore.get("event.activeDatabaseSlug") as string | null;
  if (activeDatabaseSlug && listEventDatabaseSlugs().includes(activeDatabaseSlug)) {
    switchToDatabase(activeDatabaseSlug);
  }
  if (isDatabaseConnected()) validateDatabaseTables(getDatabaseConnection());
  initializeIpcHandlers();
  if (isDatabaseConnected()) initStatEngine();

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    await mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  openDevToolsOnDomReady(mainWindow);

  // Prevent navigation in the main window
  const handleRedirect = (event: Event, url: string) => {
    if (url !== mainWindow!.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  };

  mainWindow.webContents.on("will-navigate", handleRedirect);
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    void initializeApp();
  });
}
// Proper macOS Activate Handling
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//Window Close Handler
// Quit on every platform, macOS included: a docked instance with no window
// only strands the RFID reader and holds the event database open.
app.on("window-all-closed", () => {
  app.quit();
});

// Stopping the reader is a network round trip, and will-quit cannot await one.
// Hold the quit open for it, then let the quit proceed. The timeout is the
// safety net: a reader that is unplugged or unreachable must not strand the
// operator in an app that will not close.
const RFID_STOP_TIMEOUT_MS = 3000;
let teardownStarted = false;

app.on("before-quit", (event) => {
  if (teardownStarted) return;
  teardownStarted = true;
  event.preventDefault();

  const stopped = DisconnectRFIDReader().catch((error: unknown) => {
    console.error("RFID disconnect failed during shutdown", error);
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, RFID_STOP_TIMEOUT_MS));

  void Promise.race([stopped, timeout]).then(() => app.quit());
});

// Tear down once, however the quit was triggered. Closing the connection
// checkpoints the WAL.
app.on("will-quit", () => {
  closeActiveConnection();
  shutdown();
});

powerMonitor.on("suspend", () => {
  RecoverRFIDReader();
});

powerMonitor.on("resume", () => {
  RecoverRFIDReader();
});

// Shortcuts Watcher
app.on("browser-window-created", (_, window) => {
  optimizer.watchWindowShortcuts(window);
});
