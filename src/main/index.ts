import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, shell } from "electron";
import iconLinux from "$resources/iconLinux.png?asset";
import { RFIDWebSocketProcessor } from "./api/rfid-processor";
import { createDatabaseConnection } from "./database/connect-db";
import { validateDatabaseTables } from "./database/tables-db";
import { initializeIpcHandlers } from "./ipc/init-ipc";
import { installDevTools, openDevToolsOnDomReady } from "./lib/devtools";
import { initUserDirectories } from "./lib/file-dialogs";
import { initStatEngine } from "./lib/stat-engine";
import * as appSettings from "../preload/data";

// Initialize RFID WebSocket
const rfidReaderUrl = "wss://FXR90C94E1C/ws"; //truying to connect via host name.
let rfidWebSocketProcessor: RFIDWebSocketProcessor | null = null;

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
  rfidWebSocketProcessor = new RFIDWebSocketProcessor(rfidReaderUrl, () => {
    mainWindow.webContents.send("read-rfid");
  });

  rfidWebSocketProcessor.on("connected", () => {
    console.log("RFID WebSocket connected");
  });

  rfidWebSocketProcessor.on("disconnected", () => {
    console.log("RFID WebSocket disconnected");
  });

  rfidWebSocketProcessor.on("error", (error) => {
    console.error("RFID WebSocket error:", error);
  });

  return mainWindow;
}

app.on("ready", async () => {
  console.log("Application execution path:" + app.getAppPath());

  electronApp.setAppUserModelId("com.electron");

  const mainWindow = createWindow();

  await installDevTools();

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
        if (rfidWebSocketProcessor) {
          rfidWebSocketProcessor.disconnect();
          rfidWebSocketProcessor = null;
        }
        app.quit();
      }
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
