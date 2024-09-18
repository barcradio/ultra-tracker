import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, shell } from "electron";
import iconLinux from "$resources/iconLinux.png?asset";
import { DisconnectRFIDReader } from "./api/rfid-processor";
import { createDatabaseConnection } from "./database/connect-db";
import { validateDatabaseTables } from "./database/tables-db";
import { initializeIpcHandlers } from "./ipc/init-ipc";
import { installDevTools, openDevToolsOnDomReady } from "./lib/devtools";
import { initUserDirectories } from "./lib/file-dialogs";
import { LogLevel, initialize, shutdown, uberLog } from "./lib/logger";
import { initStatEngine } from "./lib/stat-engine";
import * as appSettings from "../preload/data";

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

  mainWindow.on("ready-to-show", () => {
    mainWindow.showInactive();
    mainWindow.setTitle(app.name);
    mainWindow.setIcon(iconLinux);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  return mainWindow;
}

app.on("ready", async () => {
  uberLog(LogLevel.info, "startup", "Application execution path:" + app.getAppPath(), false);

  electronApp.setAppUserModelId("com.electron");

  const mainWindow = createWindow();

  await installDevTools();

  initialize();
  appSettings.firstRun();
  initUserDirectories();
  createDatabaseConnection();
  validateDatabaseTables();
  initializeIpcHandlers();
  initStatEngine();

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
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
  const handleRedirect = (event: Electron.Event, url: string) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  };

  mainWindow.webContents.on("will-navigate", handleRedirect);
});

app.on("browser-window-created", (_, window) => {
  optimizer.watchWindowShortcuts(window);
});
