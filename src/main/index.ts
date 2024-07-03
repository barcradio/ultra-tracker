import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { app, shell, BrowserWindow, ipcMain } from "electron";
import icon from "$resources/icon.png?asset";
import Database from 'better-sqlite3';
import global from '../shared/global';
import ipc from './ipc';

let db: Database;
let dbPath = global.shared.dbPath;
let dbFullPath = global.shared.dbFullPath;

const fs = require("fs");


function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.on('ready', () => {
  console.log("Application execution path: " + app.getAppPath());

  if (fs.existsSync(dbPath)) {
    db = global.shared.dbConnection = new Database(dbFullPath);
    db.pragma('journal_mode = WAL');
    console.log('Connected to SQLite Database: ' + dbFullPath);
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipc.init();

  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when // dock icon is clicked and there are no other windows open. if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); Quit all closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });
  });
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
