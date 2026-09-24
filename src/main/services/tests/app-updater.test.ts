import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

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

const shell = vi.hoisted(() => ({ openExternal: vi.fn() }));

vi.mock("electron", () => ({ app, dialog, BrowserWindow, shell }));

const utils = vi.hoisted(() => ({ is: { dev: false } }));
vi.mock("@electron-toolkit/utils", () => utils);

const autoUpdater = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    allowDowngrade: false,
    channel: null as string | null,
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
  get: vi.fn((key: string): unknown => (key === "display.autoUpdate" ? true : undefined))
}));
vi.mock("../../lib/store", () => ({ appStore }));

async function loadService() {
  vi.resetModules();
  return await import("../app-updater");
}

const originalPlatform = process.platform;

describe("app updater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autoUpdater.handlers.clear();
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.channel = null;
    app.getVersion.mockReturnValue("1.2.3");
    app.isPackaged = true;
    utils.is.dev = false;
    appStore.get.mockImplementation((key: string) =>
      key === "display.autoUpdate" ? true : undefined
    );
    Object.defineProperty(process, "platform", { value: "win32" });
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
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
    expect(autoUpdater.channel).toBe("latest");
    expect(autoUpdater.allowDowngrade).toBe(false);
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
    expect(autoUpdater.channel).toBe("beta");
  });

  it("uses the saved beta channel for stable builds", async () => {
    appStore.get.mockImplementation((key: string) => {
      if (key === "display.autoUpdate") return true;
      if (key === "display.updateChannel") return "beta";
      return undefined;
    });
    const { initializeAppUpdater } = await loadService();

    initializeAppUpdater();

    expect(autoUpdater.channel).toBe("beta");
    expect(autoUpdater.allowPrerelease).toBe(true);
    expect(autoUpdater.allowDowngrade).toBe(false);
  });

  it("refreshes the saved channel before a manual check", async () => {
    let channel = "stable";
    appStore.get.mockImplementation((key: string) => {
      if (key === "display.autoUpdate") return false;
      if (key === "display.updateChannel") return channel;
      return undefined;
    });
    const { initializeAppUpdater, checkForAppUpdates } = await loadService();
    initializeAppUpdater();
    channel = "beta";

    await checkForAppUpdates(true);

    expect(autoUpdater.channel).toBe("beta");
    expect(autoUpdater.allowPrerelease).toBe(true);
    expect(autoUpdater.allowDowngrade).toBe(false);
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

  it.each([
    ["darwin", undefined],
    ["linux", undefined]
  ])("only notifies on %s installs the app cannot replace itself", async (platform, appImage) => {
    Object.defineProperty(process, "platform", { value: platform });
    vi.stubEnv("APPIMAGE", appImage);
    const { initializeAppUpdater } = await loadService();

    initializeAppUpdater();

    expect(autoUpdater.autoDownload).toBe(false);
    expect(autoUpdater.autoInstallOnAppQuit).toBe(false);
  });

  it("self-updates AppImage installs", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    vi.stubEnv("APPIMAGE", "/opt/ultra-tracker.AppImage");
    const { initializeAppUpdater } = await loadService();

    initializeAppUpdater();

    expect(autoUpdater.autoDownload).toBe(true);
  });

  it("links to the release page when an update cannot self-install", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    dialog.showMessageBox.mockResolvedValueOnce({ response: 0 });
    const { initializeAppUpdater } = await loadService();
    initializeAppUpdater();

    await autoUpdater.handlers.get("update-available")?.({ version: "1.2.4" });

    expect(shell.openExternal).toHaveBeenCalledWith(
      "https://github.com/barcradio/ultra-tracker/releases/tag/v1.2.4"
    );
  });

  it("lets the operator dismiss the update notice", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    const { initializeAppUpdater } = await loadService();
    initializeAppUpdater();

    await autoUpdater.handlers.get("update-available")?.({ version: "1.2.4" });

    expect(dialog.showMessageBox).toHaveBeenCalledOnce();
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it("does not show the notice when the app will self-install", async () => {
    const { initializeAppUpdater } = await loadService();
    initializeAppUpdater();

    await autoUpdater.handlers.get("update-available")?.({ version: "1.2.4" });

    expect(dialog.showMessageBox).not.toHaveBeenCalled();
  });
});
