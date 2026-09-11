import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel, logRFID } from "../rfid-log";

const uberLog = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/logger", () => ({
  uberLog,
  LogLevel: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
}));

describe("rfid-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs under the rfid scope and copies to the event log", () => {
    logRFID(LogLevel.info, "reader online");

    expect(uberLog).toHaveBeenCalledWith(LogLevel.info, "rfid", "reader online", true);
  });

  it("joins several values into one message", () => {
    logRFID(LogLevel.warn, "tag", 42, "ignored");

    expect(uberLog).toHaveBeenCalledWith(LogLevel.warn, "rfid", "tag 42 ignored", true);
  });

  it("expands an Error into its stack so failures stay diagnosable", () => {
    const error = new Error("antenna fault");

    logRFID(LogLevel.error, "RFID error:", error);

    const message = uberLog.mock.calls[0][2] as string;
    expect(message).toContain("RFID error:");
    expect(message).toContain("antenna fault");
  });
});
