import { is } from "@electron-toolkit/utils";
import { BrowserWindow, app, dialog, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { LogLevel, uberLog } from "../lib/logger";
import { appStore } from "../lib/store";

let initialized = false;
let updateCheckInProgress = false;
let notifyWhenNoUpdateAvailable = false;

export type AppUpdateChannel = "stable" | "beta";

function logUpdater(level: LogLevel, message: string): void {
  uberLog(level, "updater", message, false);
}

// macOS needs signed ZIP artifacts and .deb belongs to the package manager.
function canSelfInstall(): boolean {
  return process.platform === "win32" || (process.platform === "linux" && !!process.env.APPIMAGE);
}

async function showUpdateAvailableNotice(version: string): Promise<void> {
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const { response } = await dialog.showMessageBox(window, {
    type: "info",
    title: "Ultra-Tracker update available",
    message: `Ultra-Tracker ${version} is available.`,
    detail: "Download and install it from the release page.",
    buttons: ["Open release page", "Dismiss"],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  });

  if (response === 0)
    void shell.openExternal(`https://github.com/barcradio/ultra-tracker/releases/tag/v${version}`);
}

export function getAppUpdateChannel(): AppUpdateChannel {
  const savedChannel = appStore.get("display.updateChannel");
  if (savedChannel === "stable" || savedChannel === "beta") return savedChannel;
  return app.getVersion().includes("-") ? "beta" : "stable";
}

function applyUpdateChannel(): void {
  const channel = getAppUpdateChannel();
  autoUpdater.channel = channel === "beta" ? "beta" : "latest";
  autoUpdater.allowPrerelease = channel === "beta";
  autoUpdater.allowDowngrade = false;
}

function configureUpdater(): void {
  const selfInstall = canSelfInstall();
  autoUpdater.autoDownload = selfInstall;
  autoUpdater.autoInstallOnAppQuit = selfInstall;
  applyUpdateChannel();

  autoUpdater.on("checking-for-update", () => logUpdater(LogLevel.info, "Checking for app update"));
  autoUpdater.on("update-available", async (info) => {
    logUpdater(LogLevel.info, `App update available: ${info.version}`);
    if (!selfInstall) await showUpdateAvailableNotice(info.version);
  });
  autoUpdater.on("update-not-available", (info) => {
    logUpdater(LogLevel.info, `No app update available: ${info.version}`);
    if (!notifyWhenNoUpdateAvailable) return;

    notifyWhenNoUpdateAvailable = false;
    void dialog.showMessageBox({
      type: "info",
      title: "No update available",
      message: "Ultra-Tracker is up to date.",
      buttons: ["OK"],
      noLink: true
    });
  });
  autoUpdater.on("download-progress", (progress) =>
    logUpdater(LogLevel.debug, `App update download progress: ${progress.percent.toFixed(1)}%`)
  );
  autoUpdater.on("error", (error) =>
    logUpdater(LogLevel.error, `App update error: ${error.message}`)
  );
  autoUpdater.on("update-downloaded", async (info) => {
    logUpdater(LogLevel.info, `App update downloaded: ${info.version}`);

    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const { response } = await dialog.showMessageBox(window, {
      type: "info",
      title: "Ultra-Tracker update ready",
      message: `Ultra-Tracker ${info.version} is ready to install.`,
      detail: "Restart the app to finish installing the update.",
      buttons: ["Restart and update", "Later"],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });

    if (response === 0) autoUpdater.quitAndInstall();
  });
}

export function initializeAppUpdater(): void {
  if (initialized || is.dev || !app.isPackaged) return;

  initialized = true;
  configureUpdater();
  if (appStore.get("display.autoUpdate") === false) {
    logUpdater(LogLevel.info, "Automatic app update checks are disabled");
    return;
  }

  void checkForAppUpdates(false);
}

export async function checkForAppUpdates(showNoUpdateDialog: boolean): Promise<void> {
  if (is.dev || !app.isPackaged) {
    if (showNoUpdateDialog) {
      await dialog.showMessageBox({
        type: "info",
        title: "Updates unavailable",
        message: "Update checks are only available in packaged builds.",
        buttons: ["OK"],
        noLink: true
      });
    }
    return;
  }

  if (updateCheckInProgress) {
    notifyWhenNoUpdateAvailable ||= showNoUpdateDialog;
    return;
  }

  updateCheckInProgress = true;
  notifyWhenNoUpdateAvailable = showNoUpdateDialog;
  try {
    applyUpdateChannel();
    logUpdater(LogLevel.info, `Using ${autoUpdater.channel} app update channel`);
    await autoUpdater.checkForUpdates();
  } catch (error) {
    notifyWhenNoUpdateAvailable = false;
    const message = error instanceof Error ? error.message : String(error);
    logUpdater(LogLevel.error, `App update check failed: ${message}`);
    if (showNoUpdateDialog) {
      await dialog.showMessageBox({
        type: "error",
        title: "Update check failed",
        message: "Ultra-Tracker could not check for updates.",
        detail: message,
        buttons: ["OK"],
        noLink: true
      });
    }
  } finally {
    updateCheckInProgress = false;
  }
}
