import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, Event, Menu, app, dialog, powerMonitor, shell } from "electron";
import iconLinux from "$resources/iconLinux.png?asset";
import { DisconnectRFIDReader, RecoverRFIDReader } from "./api/rfid-processor";
import {
  adoptLegacyDatabaseIfPresent,
  getDatabaseConnection,
  isDatabaseConnected,
  listEventDatabaseSlugs,
  switchToDatabase
} from "./database/connect-db";
import { validateDatabaseTables } from "./database/tables-db";
import { initializeIpcHandlers } from "./ipc/init-ipc";
import { integrateAppImageDesktopEntry } from "./lib/appimage-desktop-integration";
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

  const revealMainWindow = (trigger: string): void => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return;
    uberLog(LogLevel.info, "ui", `Main window ready to show (${trigger})`, false);
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setTitle(`${app.name} - v${app.getVersion()}`);
    // Linux only. Windows and macOS take their icon from the packaged bundle,
    // and calling this there replaces it with the Linux PNG. On Wayland it is
    // a no-op regardless, since the protocol has no client-set window icon;
    // it still helps under X11, where the window carries its own icon.
    if (process.platform === "linux") mainWindow.setIcon(iconLinux);
  };

  mainWindow!.once("ready-to-show", () => revealMainWindow("ready-to-show"));

  // On Wayland, ready-to-show fires late or not at all (electron/electron#48859,
  // regressed in Electron 38). The window is created hidden, so when the event
  // is missed it stays hidden forever and the app looks like it failed to open.
  // GNOME launches Electron apps with the Wayland ozone hint, so this is the
  // default path on current Ubuntu. Reveal the window anyway after a grace
  // period; the guard above keeps this a no-op wherever the event does fire.
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

  // Must complete before the first window exists. Desktop environments bind a
  // window to its .desktop entry when the window is mapped, so an entry
  // written afterwards is not picked up until the next launch, leaving this
  // run with a generic icon. No-op unless running as an AppImage.
  await integrateAppImageDesktopEntry();

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

  app.on("activate", function () {
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        DisconnectRFIDReader();
        app.quit();
      }
      shutdown();
    });
  });

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
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    DisconnectRFIDReader();
    app.quit();
  }
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
