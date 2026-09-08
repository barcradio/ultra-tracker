import os from "os";
import path from "path";
import { format } from "date-fns";
import { app } from "electron";
import log from "electron-log/main";
import { isDatabaseConnected } from "../database/connect-db";
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
  const now = format(new Date(), "yyyy-MM-dd");
  log.initialize();
  log.transports.file.resolvePathFn = () =>
    path.join(app.getPath("documents"), app.name, `.logs/${now}-main.log`);
  log.errorHandler.startCatching();
  log.transports.console.format = "[{iso}] [{level}] [{processType}] {text}";
  // Keep the app on a single console transport and let electron-log handle file output.
  // This avoids duplicates like the same message being emitted twice to the terminal.
  console.log = (...args: unknown[]) => {
    log.log(...args);
  };

  console.error = (...args: unknown[]) => {
    log.error(...args);
  };

  console.warn = (...args: unknown[]) => {
    log.warn(...args);
  };

  console.info = (...args: unknown[]) => {
    log.info(...args);
  };

  console.debug = (...args: unknown[]) => {
    log.debug(...args);
  };

  const freeMem = Number(os.freemem) / Math.pow(1024, 3);
  const totalMem = Number(os.totalmem) / Math.pow(1024, 3);
  const upTime = Number(os.uptime) / 60 / 60;

  const preamble = `----- Application Startup -----
  Name: ${app.getName()}
  Version: ${app.getVersion()}
  Locale: ${app.getLocale()}
  System Locale: ${app.getSystemLocale()}
  System Information:  
    hostname: ${os.hostname}
    type: ${os.type}
    machineType: ${os.machine}
    platform: ${os.platform}
    cpu: ${os.cpus()[0].model}
    ram: ${freeMem.toFixed(2)}/${totalMem.toFixed(2)} GB
    uptime: ${upTime.toFixed(3)} hrs
    version: ${os.version}
    homeDir: ${os.homedir}
  `;
  uberLog(LogLevel.info, "startup", preamble, false);
  uberLog(LogLevel.info, "startup", "Initializing application: Log from the main process", false);
}

export function shutdown() {
  log.errorHandler.stopCatching();
}

export function uberLog(level: LogLevel, scope: string, message: string, sendToEventLog: boolean) {
  const scopedLog = !scope ? log : log.scope(scope);
  const logMessage = `${message}`;

  if (sendToEventLog && isDatabaseConnected())
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
