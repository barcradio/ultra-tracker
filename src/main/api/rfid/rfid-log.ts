import { LogLevel, uberLog } from "../../lib/logger";

// Shared structured logger for all RFID module files (service, REST client, WS processor).
export function logRFID(level: LogLevel, ...values: unknown[]): void {
  const message = values
    .map((value) => (value instanceof Error ? (value.stack ?? value.message) : String(value)))
    .join(" ");
  uberLog(level, "rfid", message, true);
}

export { LogLevel };
