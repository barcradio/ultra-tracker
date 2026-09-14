import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (...args: unknown[]) => unknown;

// index.ts registers more than one listener for some events (notably "activate"), so keep every
// registration rather than letting a later one overwrite an earlier one.
const appHandlers = vi.hoisted(() => [] as Array<[string, Handler]>);
const powerHandlers = vi.hoisted(() => new Map<string, Handler>());

const app = vi.hoisted(() => ({
  name: "ultra-tracker",
  on: vi.fn((event: string, handler: Handler) => {
    appHandlers.push([event, handler]);
  }),
  quit: vi.fn(),
  getAppPath: vi.fn(() => "/opt/ultra-tracker"),
  getVersion: vi.fn(() => "1.2.3"),
  requestSingleInstanceLock: vi.fn(() => true),
  whenReady: vi.fn(async () => undefined)
}));

const webContents = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    on: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
    setWindowOpenHandler: vi.fn(),
    getURL: vi.fn(() => "app://index.html"),
    reloadIgnoringCache: vi.fn()
  };
});

const window = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    once: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
    show: vi.fn(),
    focus: vi.fn(),
    restore: vi.fn(),
    reload: vi.fn(),
    isMinimized: vi.fn(() => false),
    isDestroyed: vi.fn(() => false),
    setTitle: vi.fn(),
    setIcon: vi.fn(),
    loadURL: vi.fn(async () => undefined),
    loadFile: vi.fn(async () => undefined),
    webContents
  };
});

interface BrowserWindowOptions {
  webPreferences: { preload: string; sandbox: boolean };
  show: boolean;
}

const BrowserWindow = vi.hoisted(() =>
  Object.assign(
    vi.fn(function (_options?: unknown) {
      return window;
    }),
    { getAllWindows: vi.fn((): unknown[] => []) }
  )
);

const dialog = vi.hoisted(() => ({
  showMessageBox: vi.fn(async (_window?: unknown, _options?: unknown) => ({ response: 0 }))
}));
const shell = vi.hoisted(() => ({ openExternal: vi.fn() }));
const Menu = vi.hoisted(() => ({
  setApplicationMenu: vi.fn(),
  buildFromTemplate: vi.fn((template: unknown) => template)
}));
const powerMonitor = vi.hoisted(() => ({
  on: vi.fn((event: string, handler: Handler) => {
    powerHandlers.set(event, handler);
  })
}));

vi.mock("electron", () => ({ app, BrowserWindow, dialog, shell, Menu, powerMonitor }));

const utils = vi.hoisted(() => ({
  electronApp: { setAppUserModelId: vi.fn() },
  is: { dev: false },
  optimizer: { watchWindowShortcuts: vi.fn() }
}));
vi.mock("@electron-toolkit/utils", () => utils);

vi.mock("$resources/iconLinux.png?asset", () => ({ default: "iconLinux.png" }));

const rfid = vi.hoisted(() => ({
  DisconnectRFIDReader: vi.fn(),
  RecoverRFIDReader: vi.fn()
}));
vi.mock("../api/rfid-processor", () => rfid);

const connect = vi.hoisted(() => ({
  adoptLegacyDatabaseIfPresent: vi.fn(),
  getDatabaseConnection: vi.fn(() => ({})),
  isDatabaseConnected: vi.fn(() => true),
  listEventDatabaseSlugs: vi.fn(() => ["bear-100"]),
  switchToDatabase: vi.fn()
}));
vi.mock("../database/connect-db", () => connect);

const validateDatabaseTables = vi.hoisted(() => vi.fn());
vi.mock("../database/tables-db", () => ({ validateDatabaseTables }));

const initializeIpcHandlers = vi.hoisted(() => vi.fn());
vi.mock("../ipc/init-ipc", () => ({ initializeIpcHandlers }));

const devtools = vi.hoisted(() => ({
  installDevTools: vi.fn(async () => undefined),
  openDevToolsOnDomReady: vi.fn()
}));
vi.mock("../lib/devtools", () => devtools);

const initUserDirectories = vi.hoisted(() => vi.fn());
vi.mock("../lib/file-dialogs", () => ({ initUserDirectories }));

const logger = vi.hoisted(() => ({
  initialize: vi.fn(),
  shutdown: vi.fn(),
  uberLog: vi.fn(),
  LogLevel: { error: 0, warn: 1, info: 2 }
}));
vi.mock("../lib/logger", () => logger);

const initStatEngine = vi.hoisted(() => vi.fn());
vi.mock("../lib/stat-engine", () => ({ initStatEngine }));

const storeMock = vi.hoisted(() => {
  const data = new Map<string, unknown>();
  return {
    data,
    get: vi.fn((key: string) => data.get(key)),
    set: vi.fn()
  };
});
vi.mock("../lib/store", () => ({ appStore: storeMock }));

const originalPlatform = process.platform;

function setPlatform(platform: string) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}

/** Invokes every listener index.ts registered for an app event. */
function emitApp(event: string, ...args: unknown[]) {
  for (const [name, handler] of appHandlers) {
    if (name === event) handler(...args);
  }
}

/** Boots the main process module fresh; everything it touches at import time is stubbed above. */
async function bootMain() {
  vi.resetModules();
  await import("../index");
  // app.whenReady().then(...) schedules initializeApp on the microtask queue.
  await vi.waitFor(() => expect(BrowserWindow).toHaveBeenCalled(), {
    timeout: 5000,
    interval: 5
  });
  await new Promise((resolve) => setImmediate(resolve));
}

describe("main process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appHandlers.length = 0;
    powerHandlers.clear();
    window.handlers.clear();
    webContents.handlers.clear();
    storeMock.data.clear();
    app.requestSingleInstanceLock.mockReturnValue(true);
    connect.isDatabaseConnected.mockReturnValue(true);
    connect.listEventDatabaseSlugs.mockReturnValue(["bear-100"]);
    window.isDestroyed.mockReturnValue(false);
    utils.is.dev = false;
    setPlatform("linux");
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true
    });
  });

  describe("single instance lock", () => {
    it("quits immediately when another copy already holds the lock", async () => {
      app.requestSingleInstanceLock.mockReturnValue(false);
      vi.resetModules();

      await import("../index");

      expect(app.quit).toHaveBeenCalled();
      expect(app.whenReady).not.toHaveBeenCalled();
    });

    it("focuses the existing window when a second copy is launched", async () => {
      await bootMain();
      window.isMinimized.mockReturnValue(true);

      emitApp("second-instance");

      expect(window.restore).toHaveBeenCalled();
      expect(window.focus).toHaveBeenCalled();
    });
  });

  describe("startup", () => {
    it("creates the main window with the preload bridge and no sandbox escape", async () => {
      await bootMain();

      const options = BrowserWindow.mock.calls[0][0] as BrowserWindowOptions;
      expect(options.webPreferences.preload).toContain("preload");
      expect(options.webPreferences.sandbox).toBe(false);
      expect(options.show).toBe(false);
    });

    it("installs an application menu", async () => {
      await bootMain();

      expect(Menu.setApplicationMenu).toHaveBeenCalled();
    });

    it("prepares the log, user directories and IPC handlers", async () => {
      await bootMain();

      expect(logger.initialize).toHaveBeenCalled();
      expect(initUserDirectories).toHaveBeenCalled();
      expect(initializeIpcHandlers).toHaveBeenCalled();
    });

    it("reopens the database the operator last used", async () => {
      storeMock.data.set("event.activeDatabaseSlug", "bear-100");

      await bootMain();

      expect(connect.switchToDatabase).toHaveBeenCalledWith("bear-100");
    });

    it("ignores a remembered database that is no longer on disk", async () => {
      storeMock.data.set("event.activeDatabaseSlug", "deleted-race");

      await bootMain();

      expect(connect.switchToDatabase).not.toHaveBeenCalled();
    });

    it("validates the schema and starts the stat engine when a database is open", async () => {
      await bootMain();

      expect(validateDatabaseTables).toHaveBeenCalled();
      expect(initStatEngine).toHaveBeenCalled();
    });

    it("skips schema validation when no database is open", async () => {
      connect.isDatabaseConnected.mockReturnValue(false);

      await bootMain();

      expect(validateDatabaseTables).not.toHaveBeenCalled();
      expect(initStatEngine).not.toHaveBeenCalled();
    });

    it("loads the built renderer in production", async () => {
      await bootMain();

      expect(window.loadFile).toHaveBeenCalled();
      expect(window.loadURL).not.toHaveBeenCalled();
    });

    it("loads the dev server when running in development", async () => {
      utils.is.dev = true;
      vi.stubEnv("ELECTRON_RENDERER_URL", "http://localhost:5173");

      await bootMain();

      expect(window.loadURL).toHaveBeenCalledWith("http://localhost:5173");
      vi.unstubAllEnvs();
    });

    it("shows the window only once it is ready to paint", async () => {
      await bootMain();

      expect(window.show).not.toHaveBeenCalled();
      window.handlers.get("ready-to-show")?.();

      expect(window.show).toHaveBeenCalled();
      expect(window.setTitle).toHaveBeenCalledWith("ultra-tracker - v1.2.3");
    });
  });

  describe("navigation safety", () => {
    it("opens a new-window request in the operator's browser instead", async () => {
      await bootMain();
      const handler = webContents.setWindowOpenHandler.mock.calls[0][0] as (details: {
        url: string;
      }) => { action: string };

      const result = handler({ url: "https://opensplittime.org" });

      expect(result).toEqual({ action: "deny" });
      expect(shell.openExternal).toHaveBeenCalledWith("https://opensplittime.org");
    });

    it("blocks navigation away from the app window", async () => {
      await bootMain();
      const event = { preventDefault: vi.fn() };

      webContents.handlers.get("will-navigate")?.(event, "https://example.com");

      expect(event.preventDefault).toHaveBeenCalled();
      expect(shell.openExternal).toHaveBeenCalledWith("https://example.com");
    });

    it("allows a navigation to the page already loaded", async () => {
      await bootMain();
      const event = { preventDefault: vi.fn() };

      webContents.handlers.get("will-navigate")?.(event, "app://index.html");

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("renderer crash recovery", () => {
    it("offers the operator a reload", async () => {
      await bootMain();

      webContents.handlers.get("render-process-gone")?.({}, { reason: "crashed" });
      await vi.waitFor(() => expect(dialog.showMessageBox).toHaveBeenCalled());

      const options = dialog.showMessageBox.mock.calls[0][1] as { buttons: string[] };
      expect(options.buttons).toEqual(["Reload", "Force Reload", "Close"]);
    });

    it("reloads when the operator chooses Reload", async () => {
      await bootMain();
      dialog.showMessageBox.mockResolvedValue({ response: 0 });

      webContents.handlers.get("render-process-gone")?.({}, { reason: "crashed" });
      await vi.waitFor(() => expect(window.reload).toHaveBeenCalled());
    });

    it("force reloads when the operator chooses Force Reload", async () => {
      await bootMain();
      dialog.showMessageBox.mockResolvedValue({ response: 1 });

      webContents.handlers.get("render-process-gone")?.({}, { reason: "crashed" });
      await vi.waitFor(() => expect(webContents.reloadIgnoringCache).toHaveBeenCalled());
    });

    it("does not stack dialogs when the renderer crashes repeatedly", async () => {
      await bootMain();
      let resolveDialog: (value: { response: number }) => void = () => {};
      dialog.showMessageBox.mockReturnValue(
        new Promise((resolve) => {
          resolveDialog = resolve;
        })
      );

      webContents.handlers.get("render-process-gone")?.({}, { reason: "crashed" });
      webContents.handlers.get("render-process-gone")?.({}, { reason: "crashed again" });

      expect(dialog.showMessageBox).toHaveBeenCalledTimes(1);
      resolveDialog({ response: 2 });
    });

    it("stays quiet when the window has already gone", async () => {
      await bootMain();
      window.isDestroyed.mockReturnValue(true);

      webContents.handlers.get("render-process-gone")?.({}, { reason: "crashed" });

      expect(dialog.showMessageBox).not.toHaveBeenCalled();
    });
  });

  describe("shutdown", () => {
    it("releases the RFID reader and quits when the last window closes", async () => {
      await bootMain();

      emitApp("window-all-closed");

      expect(rfid.DisconnectRFIDReader).toHaveBeenCalled();
      expect(app.quit).toHaveBeenCalled();
      expect(logger.shutdown).toHaveBeenCalled();
    });

    it("keeps running on macOS when the last window closes", async () => {
      setPlatform("darwin");
      await bootMain();

      emitApp("window-all-closed");

      expect(app.quit).not.toHaveBeenCalled();
      expect(logger.shutdown).toHaveBeenCalled();
    });
  });

  describe("macOS activate", () => {
    it("reopens a window when the dock icon is clicked with none open", async () => {
      await bootMain();
      BrowserWindow.mockClear();
      BrowserWindow.getAllWindows.mockReturnValue([]);

      emitApp("activate");

      expect(BrowserWindow).toHaveBeenCalled();
    });

    it("does nothing when a window is already open", async () => {
      await bootMain();
      BrowserWindow.mockClear();
      BrowserWindow.getAllWindows.mockReturnValue([window]);

      emitApp("activate");

      expect(BrowserWindow).not.toHaveBeenCalled();
    });
  });

  describe("power events", () => {
    it("recovers the RFID reader when the machine suspends", async () => {
      await bootMain();

      powerHandlers.get("suspend")?.();

      expect(rfid.RecoverRFIDReader).toHaveBeenCalled();
    });

    it("recovers the RFID reader when the machine resumes", async () => {
      await bootMain();

      powerHandlers.get("resume")?.();

      expect(rfid.RecoverRFIDReader).toHaveBeenCalled();
    });
  });

  it("watches window shortcuts on every new window", async () => {
    await bootMain();

    emitApp("browser-window-created", null, window);

    expect(utils.optimizer.watchWindowShortcuts).toHaveBeenCalledWith(window);
  });
});
