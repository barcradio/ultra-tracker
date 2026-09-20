import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDevTools, openDevToolsOnDomReady } from "../devtools";

const installExtension = vi.hoisted(() => vi.fn(async () => "REACT_DEVELOPER_TOOLS"));
vi.mock("electron-devtools-installer", () => ({
  default: installExtension,
  REACT_DEVELOPER_TOOLS: "react-devtools-id"
}));
vi.mock("electron", () => ({ BrowserWindow: class {} }));

const originalNodeEnv = process.env.NODE_ENV;

function fakeWindow() {
  const handlers = new Map<string, () => void>();
  return {
    focus: vi.fn(),
    webContents: {
      once: vi.fn((event: string, handler: () => void) => {
        handlers.set(event, handler);
      })
    },
    handlers
  };
}

describe("devtools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("installDevTools", () => {
    it("installs the React developer tools in development", async () => {
      process.env.NODE_ENV = "development";

      await installDevTools();

      expect(installExtension).toHaveBeenCalledWith(
        "react-devtools-id",
        expect.objectContaining({ forceDownload: false })
      );
    });

    it("skips installation outside development", async () => {
      process.env.NODE_ENV = "production";

      await installDevTools();

      expect(installExtension).not.toHaveBeenCalled();
    });

    it("keeps starting up when the install fails", async () => {
      process.env.NODE_ENV = "development";
      installExtension.mockRejectedValue(new Error("no network"));

      await expect(installDevTools()).resolves.toBeUndefined();
    });
  });

  describe("openDevToolsOnDomReady", () => {
    it("waits for the DOM in development", () => {
      process.env.NODE_ENV = "development";
      const window = fakeWindow();

      openDevToolsOnDomReady(window as never);

      expect(window.webContents.once).toHaveBeenCalledWith("dom-ready", expect.any(Function));
    });

    it("does nothing outside development", () => {
      process.env.NODE_ENV = "production";
      const window = fakeWindow();

      openDevToolsOnDomReady(window as never);

      expect(window.webContents.once).not.toHaveBeenCalled();
    });

    it("focuses the window once the devtools open", () => {
      process.env.NODE_ENV = "development";
      const window = fakeWindow();

      openDevToolsOnDomReady(window as never);
      window.handlers.get("dom-ready")?.();
      window.handlers.get("devtools-opened")?.();

      expect(window.focus).toHaveBeenCalled();
    });
  });
});
