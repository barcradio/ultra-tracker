import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, Event, Menu, app, dialog, powerMonitor, shell } from "electron";
import iconLinux from "$resources/iconLinux.png?asset";
import iconWin from "$resources/iconWin.png?asset";
import { CloseRFIDWebSocket, RecoverRFIDReader } from "./api/rfid-processor";
import {
  adoptLegacyDatabaseIfPresent,
  closeDatabaseConnection,
  getDatabaseConnection,
  isDatabaseConnected,
  listEventDatabaseSlugs,
  setEventLifecycleHandlers,
  switchToDatabase
} from "./database/connect-db";
import { validateDatabaseTables } from "./database/tables-db";
import { initializeIpcHandlers } from "./ipc/init-ipc";
import { integrateAppImageDesktopEntry } from "./lib/appimage-desktop-integration";
import { installDevTools, openDevToolsOnDomReady } from "./lib/devtools";
import { initUserDirectories } from "./lib/file-dialogs";
import { LogLevel, initialize, shutdown, uberLog } from "./lib/logger";
import { closeStatEngine, initStatEngine } from "./lib/stat-engine";
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
    ...(process.platform === "win32" ? { icon: iconWin } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  let rendererCrashDialogOpen = false;

  const revealMainWindow = (trigger: string): void => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return;
    uberLog(LogLevel.info, "ui", `Main window ready to show (${trigger})`, false);
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setTitle(`${app.name} - v${app.getVersion()}`);
    // Linux only: packaged Windows and macOS bundles carry their own icon.
    if (process.platform === "linux") mainWindow.setIcon(iconLinux);
  };

  mainWindow!.once("ready-to-show", () => revealMainWindow("ready-to-show"));

  // On Wayland, ready-to-show can never fire (electron/electron#48859); revealMainWindow
  // is guarded, so this is a no-op wherever the event does arrive.
  const readyToShowFallback = setTimeout(() => revealMainWindow("fallback timer"), 5000);
  mainWindow!.once("show", () => clearTimeout(readyToShowFallback));
  mainWindow!.once("closed", () => clearTimeout(readyToShowFallback));

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

  // Must finish before the first window: the desktop binds a window when it is mapped.
  await integrateAppImageDesktopEntry();

  if (process.platform === "darwin" && is.dev) app.dock?.setIcon(iconLinux);

  createWindow();

  if (!mainWindow) return;

  await installDevTools();

  initialize();
  initUserDirectories();
  setEventLifecycleHandlers(initStatEngine, closeStatEngine);
  adoptLegacyDatabaseIfPresent();
  const activeDatabaseSlug = appStore.get("event.activeDatabaseSlug") as string | null;
  if (activeDatabaseSlug && listEventDatabaseSlugs().includes(activeDatabaseSlug)) {
    switchToDatabase(activeDatabaseSlug);
  }
  if (isDatabaseConnected()) validateDatabaseTables(getDatabaseConnection());
  initializeIpcHandlers();

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
// Quit on macOS too: a docked instance strands the RFID reader and holds the database open.
app.on("window-all-closed", () => {
  app.quit();
});

// Synchronous on purpose: the websocket closes before the process goes and the WAL checkpoints.
app.on("will-quit", () => {
  CloseRFIDWebSocket();
  closeDatabaseConnection();
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
  optimizer.watchWindowShortcuts(window, { zoom: true });
});
