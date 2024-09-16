import path from "path";
import { app } from "electron";
import log from "electron-log/main";
import { logEvent } from "../database/eventLogger-db";

export enum LogLevel {
  error,
  warn,
  info,
  verbose,
  debug,
  silly
}

// By default, two transports are active: console and file.
export function initialize() {
  log.initialize();
  log.transports.file.resolvePathFn = () =>
    path.join(app.getPath("documents"), app.name, ".logs/main.log");
  log.errorHandler.startCatching();
  log.transports.console.format = "[{iso}] [{level}] [{processType}] {text}";
  // Override console methods to log both to console and electron-log
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = (...args: unknown[]) => {
    log.log(...args); // Log to electron-log
    originalLog(...args); // Log to console
  };

  console.error = (...args: unknown[]) => {
    log.error(...args); // Log to electron-log
    originalError(...args); // Log to console
  };

  console.warn = (...args: unknown[]) => {
    log.warn(...args); // Log to electron-log
    originalWarn(...args); // Log to console
  };

  console.info = (...args: unknown[]) => {
    log.info(...args); // Log to electron-log
    originalInfo(...args); // Log to console
  };

  console.debug = (...args: unknown[]) => {
    log.debug(...args); // Log to electron-log
    originalDebug(...args); // Log to console
  };

  uberLog(LogLevel.info, "startup", "Initializing application: Log from the main process", false);
}

export function shutdown() {
  log.errorHandler.stopCatching();
}

export function uberLog(level: LogLevel, scope: string, message: string, sendToEventLog: boolean) {
  const scopedLog = !scope ? log : log.scope(scope);
  const logMessage = `${message}`;

  if (sendToEventLog)
    logEvent(-1, null, null, null, new Date().toISOString(), logMessage, false, false);

  switch (level) {
    case LogLevel.error:
      scopedLog.error(logMessage);
      break;

    case LogLevel.warn:
      scopedLog.warn(logMessage);
      break;

    case LogLevel.info:
      scopedLog.info(logMessage);
      break;

    case LogLevel.verbose:
      scopedLog.verbose(logMessage);
      break;

    case LogLevel.debug:
      scopedLog.debug(logMessage);
      break;

    case LogLevel.silly:
      scopedLog.silly(logMessage);
      break;
  }
}
