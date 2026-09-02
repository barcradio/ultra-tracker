import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, Event, app, dialog, shell } from "electron";
import iconLinux from "$resources/iconLinux.png?asset";
import { DisconnectRFIDReader } from "./api/rfid-processor";
import { createDatabaseConnection } from "./database/connect-db";
import { validateDatabaseTables } from "./database/tables-db";
import { initializeIpcHandlers } from "./ipc/init-ipc";
import { installDevTools, openDevToolsOnDomReady } from "./lib/devtools";
import { initUserDirectories } from "./lib/file-dialogs";
import { LogLevel, initialize, shutdown, uberLog } from "./lib/logger";
import { initStatEngine } from "./lib/stat-engine";

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 1080,
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

  mainWindow.once("ready-to-show", () => {
    uberLog(LogLevel.info, "ui", "Main window ready to show", true);
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setTitle(`${app.name} - v${app.getVersion()}`);
    mainWindow.setIcon(iconLinux);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    if (rendererCrashDialogOpen || mainWindow.isDestroyed()) return;

    rendererCrashDialogOpen = true;
    const reloadShortcut = process.platform === "darwin" ? "Cmd+R" : "Ctrl+R";
    const forceReloadShortcut = process.platform === "darwin" ? "Cmd+Shift+R" : "Ctrl+Shift+R";

    void dialog
      .showMessageBox(mainWindow, {
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
        if (mainWindow.isDestroyed()) return;
        if (response === 0) mainWindow.reload();
        if (response === 1) mainWindow.webContents.reloadIgnoringCache();
      })
      .finally(() => {
        rendererCrashDialogOpen = false;
      });
  });

  return mainWindow;
}

app.on("ready", async () => {
  uberLog(LogLevel.info, "startup", "Application execution path:" + app.getAppPath(), false);

  electronApp.setAppUserModelId("com.electron");

  const mainWindow = createWindow();

  await installDevTools();

  initialize();
  initUserDirectories();
  createDatabaseConnection();
  validateDatabaseTables();
  initializeIpcHandlers();
  initStatEngine();

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
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  };

  mainWindow.webContents.on("will-navigate", handleRedirect);
});
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

// Shortcuts Watcher
app.on("browser-window-created", (_, window) => {
  optimizer.watchWindowShortcuts(window);
});
