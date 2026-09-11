import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel, initialize, shutdown, uberLog } from "../logger";

const scopedLog = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  verbose: vi.fn(),
  debug: vi.fn(),
  silly: vi.fn()
}));

const log = vi.hoisted(() => {
  const base = {
    initialize: vi.fn(),
    scope: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
    errorHandler: { startCatching: vi.fn(), stopCatching: vi.fn() },
    transports: {
      file: { resolvePathFn: undefined as unknown },
      console: { format: "" }
    }
  };
  return base;
});
vi.mock("electron-log/main", () => ({ default: log }));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp/documents"),
    name: "ultra-tracker",
    getName: vi.fn(() => "ultra-tracker"),
    getVersion: vi.fn(() => "1.0.0"),
    getLocale: vi.fn(() => "en-US"),
    getSystemLocale: vi.fn(() => "en-US")
  }
}));

const isDatabaseConnected = vi.hoisted(() => vi.fn(() => false));
vi.mock("../../database/connect-db", () => ({ isDatabaseConnected }));

const logEvent = vi.hoisted(() => vi.fn());
vi.mock("../../database/eventLogger-db", () => ({ logEvent }));

describe("logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    log.scope.mockReturnValue(scopedLog);
    isDatabaseConnected.mockReturnValue(false);
  });

  describe("initialize", () => {
    it("starts electron-log and catches uncaught errors", () => {
      initialize();

      expect(log.initialize).toHaveBeenCalled();
      expect(log.errorHandler.startCatching).toHaveBeenCalled();
    });

    it("writes the log file under the app's documents folder, dated", () => {
      initialize();

      const resolvePath = log.transports.file.resolvePathFn as () => string;
      expect(resolvePath()).toMatch(/\.logs\/\d{4}-\d{2}-\d{2}-main\.log$/);
    });

    it("records a startup preamble describing the machine", () => {
      initialize();

      expect(scopedLog.info).toHaveBeenCalledWith(expect.stringContaining("Application Startup"));
    });
  });

  describe("shutdown", () => {
    it("stops catching uncaught errors", () => {
      shutdown();

      expect(log.errorHandler.stopCatching).toHaveBeenCalled();
    });
  });

  describe("uberLog", () => {
    it.each([
      [LogLevel.error, "error"],
      [LogLevel.warn, "warn"],
      [LogLevel.info, "info"],
      [LogLevel.verbose, "verbose"],
      [LogLevel.debug, "debug"],
      [LogLevel.silly, "silly"]
    ])("routes level %i to the matching transport", (level, method) => {
      uberLog(level as LogLevel, "rfid", "a message", false);

      expect(scopedLog[method as keyof typeof scopedLog]).toHaveBeenCalledWith("a message");
    });

    it("scopes the message when a scope is given", () => {
      uberLog(LogLevel.info, "rfid", "a message", false);

      expect(log.scope).toHaveBeenCalledWith("rfid");
    });

    it("logs unscoped when no scope is given", () => {
      uberLog(LogLevel.info, "", "a message", false);

      expect(log.scope).not.toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith("a message");
    });

    it("copies the message into the event log when asked and the database is open", () => {
      isDatabaseConnected.mockReturnValue(true);

      uberLog(LogLevel.warn, "rfid", "reader offline", true);

      expect(logEvent).toHaveBeenCalledWith(
        -1,
        null,
        null,
        null,
        expect.any(String),
        "reader offline",
        false,
        false
      );
    });

    it("skips the event log when the database is not open", () => {
      isDatabaseConnected.mockReturnValue(false);

      uberLog(LogLevel.warn, "rfid", "reader offline", true);

      expect(logEvent).not.toHaveBeenCalled();
    });

    it("skips the event log when not asked for it", () => {
      isDatabaseConnected.mockReturnValue(true);

      uberLog(LogLevel.info, "rfid", "just console", false);

      expect(logEvent).not.toHaveBeenCalled();
    });
  });
});
