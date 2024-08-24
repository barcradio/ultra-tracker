import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, shell } from "electron";
import iconLinux from "$resources/iconLinux.png?asset";
import { createDatabaseConnection } from "./database/connect-db";
import { initializeIpcHandlers } from "./ipc/init-ipc";
import { installDevTools, openDevToolsOnDomReady } from "./lib/devtools";
import { initUserDirectories } from "./lib/file-dialogs";
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
  console.log("Application execution path:" + app.getAppPath());

  electronApp.setAppUserModelId("com.electron");

  const mainWindow = createWindow();

  await installDevTools();

  createDatabaseConnection();
  initializeIpcHandlers();
  initUserDirectories();
  initStatEngine();

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  app.on("activate", function () {
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });
  });

  openDevToolsOnDomReady(mainWindow);
});

app.on("browser-window-created", (_, window) => {
  optimizer.watchWindowShortcuts(window);
});
