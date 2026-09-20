import { describe, expect, it, vi } from "vitest";
import { initializeIpcHandlers } from "../init-ipc";

const inits = vi.hoisted(() => ({
  initAthleteHandlers: vi.fn(),
  initdbSettingsHandlers: vi.fn(),
  initEventDatabaseHandlers: vi.fn(),
  initEventLogsHandlers: vi.fn(),
  initExportHandlers: vi.fn(),
  initOpenSplitTimeHandlers: vi.fn(),
  initResourceHandlers: vi.fn(),
  initRFIDHandlers: vi.fn(),
  initRunnerFormHandlers: vi.fn(),
  initSettingsHandlers: vi.fn(),
  initStationHandlers: vi.fn(),
  initStatsHandlers: vi.fn(),
  initStatusHandlers: vi.fn(),
  initStoreHandlers: vi.fn()
}));

vi.mock("../athletes-ipc", () => ({ initAthleteHandlers: inits.initAthleteHandlers }));
vi.mock("../dbsettings-ipc", () => ({ initdbSettingsHandlers: inits.initdbSettingsHandlers }));
vi.mock("../event-databases-ipc", () => ({
  initEventDatabaseHandlers: inits.initEventDatabaseHandlers
}));
vi.mock("../eventLogs-ipc", () => ({ initEventLogsHandlers: inits.initEventLogsHandlers }));
vi.mock("../export-ipc", () => ({ initExportHandlers: inits.initExportHandlers }));
vi.mock("../opensplittime-ipc", () => ({
  initOpenSplitTimeHandlers: inits.initOpenSplitTimeHandlers
}));
vi.mock("../resource-ipc", () => ({ initResourceHandlers: inits.initResourceHandlers }));
vi.mock("../rfid-ipc", () => ({ initRFIDHandlers: inits.initRFIDHandlers }));
vi.mock("../runnerform-ipc", () => ({ initRunnerFormHandlers: inits.initRunnerFormHandlers }));
vi.mock("../settings-ipc", () => ({ initSettingsHandlers: inits.initSettingsHandlers }));
vi.mock("../stations-ipc", () => ({ initStationHandlers: inits.initStationHandlers }));
vi.mock("../stats-ipc", () => ({ initStatsHandlers: inits.initStatsHandlers }));
vi.mock("../status-ipc", () => ({ initStatusHandlers: inits.initStatusHandlers }));
vi.mock("../store-ipc", () => ({ initStoreHandlers: inits.initStoreHandlers }));

describe("init-ipc", () => {
  it("registers every IPC handler group exactly once", () => {
    initializeIpcHandlers();

    for (const init of Object.values(inits)) {
      expect(init).toHaveBeenCalledTimes(1);
    }
  });
});
