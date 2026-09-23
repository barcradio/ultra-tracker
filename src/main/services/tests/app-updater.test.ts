import { beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (...args: unknown[]) => unknown;

const app = vi.hoisted(() => ({
  getVersion: vi.fn(() => "1.2.3"),
  isPackaged: true
}));

const dialog = vi.hoisted(() => ({
  showMessageBox: vi.fn(async () => ({ response: 1 }))
}));

const BrowserWindow = vi.hoisted(() => ({
  getFocusedWindow: vi.fn(() => null),
  getAllWindows: vi.fn(() => [])
}));

vi.mock("electron", () => ({ app, dialog, BrowserWindow }));

const utils = vi.hoisted(() => ({ is: { dev: false } }));
vi.mock("@electron-toolkit/utils", () => utils);

const autoUpdater = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    on: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
    checkForUpdates: vi.fn(async () => undefined),
    quitAndInstall: vi.fn()
  };
});
vi.mock("electron-updater", () => ({ autoUpdater }));

const logger = vi.hoisted(() => ({
  LogLevel: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 },
  uberLog: vi.fn()
}));
vi.mock("../../lib/logger", () => logger);

const appStore = vi.hoisted(() => ({
  get: vi.fn(() => true)
}));
vi.mock("../../lib/store", () => ({ appStore }));

async function loadService() {
  vi.resetModules();
  return await import("../app-updater");
}

describe("app updater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autoUpdater.handlers.clear();
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = false;
    app.getVersion.mockReturnValue("1.2.3");
    app.isPackaged = true;
    utils.is.dev = false;
    appStore.get.mockReturnValue(true);
  });

  it("stays disabled in development", async () => {
    utils.is.dev = true;
    const { initializeAppUpdater } = await loadService();

    initializeAppUpdater();

    expect(autoUpdater.on).not.toHaveBeenCalled();
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it("configures packaged update checks", async () => {
    const { initializeAppUpdater } = await loadService();

    initializeAppUpdater();

    expect(autoUpdater.autoDownload).toBe(true);
    expect(autoUpdater.autoInstallOnAppQuit).toBe(true);
    expect(autoUpdater.allowPrerelease).toBe(false);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledOnce();
  });

  it("skips the startup check when automatic updates are disabled", async () => {
    appStore.get.mockReturnValue(false);
    const { initializeAppUpdater } = await loadService();

    initializeAppUpdater();

    expect(autoUpdater.on).toHaveBeenCalled();
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it("allows prerelease updates for prerelease builds", async () => {
    app.getVersion.mockReturnValue("1.2.3-alpha.1");
    const { initializeAppUpdater } = await loadService();

    initializeAppUpdater();

    expect(autoUpdater.allowPrerelease).toBe(true);
  });

  it("reports no update for manual checks", async () => {
    const { initializeAppUpdater, checkForAppUpdates } = await loadService();
    initializeAppUpdater();

    await checkForAppUpdates(true);
    autoUpdater.handlers.get("update-not-available")?.({ version: "1.2.3" });

    expect(dialog.showMessageBox).toHaveBeenCalledWith({
      type: "info",
      title: "No update available",
      message: "Ultra-Tracker is up to date.",
      buttons: ["OK"],
      noLink: true
    });
  });
});