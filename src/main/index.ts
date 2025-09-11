import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, shell } from "electron";
import iconLinux from "$resources/iconLinux.png?asset";
import { RfidController } from "./api/rfid/rfid-controller";
import { createDatabaseConnection } from "./database/connect-db";
import { validateDatabaseTables } from "./database/tables-db";
import { initializeIpcHandlers } from "./ipc/init-ipc";
import { installDevTools, openDevToolsOnDomReady } from "./lib/devtools";
import { initUserDirectories } from "./lib/file-dialogs";
import { LogLevel, initialize, shutdown, uberLog } from "./lib/logger";
import { initStatEngine } from "./lib/stat-engine";
import { allowHost, installCertGate } from "./api/cert-guard";
app.commandLine.appendSwitch("ignore-certificate-errors");

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
      sandbox: false,
    //bad not good shod do something else the last ditch effort of a desprate man
   // Allows content from insecure sources
    nodeIntegration: false,
     webSecurity: false,
    allowRunningInsecureContent: true
    }
  });

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

  return mainWindow;
}

app.on("ready", async () => {
  uberLog(LogLevel.info, "startup", "Application execution path:" + app.getAppPath(), false);

  electronApp.setAppUserModelId("com.electron");

  const mainWindow = createWindow();

  await installDevTools();
  allowHost("fxr90c94e1c");
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
  installCertGate();
  app.on("activate", function () {
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        RfidController.getInstance().disconnect();
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
// Proper macOS Activate Handling
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//Window Close Handler
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    RfidController.getInstance().disconnect();
    app.quit();
  }
  shutdown();
});

// Shortcuts Watcher
app.on("browser-window-created", (_, window) => {
  optimizer.watchWindowShortcuts(window);
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  
    // Prevent having error
    event.preventDefault()
    // and continue
    callback(true)

})

app.whenReady().then(() => {
  installCertGate();
});