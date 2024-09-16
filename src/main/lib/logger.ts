import path from "path";
import { app } from "electron";
import log from "electron-log/main";

// By default, two transports are active: console and file.
export function initialize() {
  log.initialize();
  log.transports.file.resolvePathFn = () =>
    path.join(app.getPath("documents"), app.name, ".logs/main.log");
  log.errorHandler.startCatching();
  //log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
  log.info("Log from the main process");
}

export function shutdown() {
  log.errorHandler.stopCatching();
}

//export function logEvent() {}
