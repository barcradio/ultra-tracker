import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseStatus } from "$shared/enums";
import { initStationHandlers } from "../stations-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const GetStations = vi.hoisted(() => vi.fn());
const SetStationIdentity = vi.hoisted(() => vi.fn());
const GetStationByIdentifier = vi.hoisted(() => vi.fn());
vi.mock("../../database/stations-db", () => ({
  GetStations,
  SetStationIdentity,
  GetStationByIdentifier
}));

describe("stations-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    initStationHandlers();
  });

  function invoke(channel: string, param?: unknown) {
    const handler = ipcHandlers.get(channel);
    if (!handler) throw new Error(`${channel} handler was not registered`);
    return handler(undefined, param);
  }

  it("get-stations-list forwards to GetStations", () => {
    GetStations.mockReturnValue([[], DatabaseStatus.Success, ""]);

    const result = invoke("get-stations-list");

    expect(GetStations).toHaveBeenCalled();
    expect(result).toEqual([[], DatabaseStatus.Success, ""]);
  });

  it("set-station-identity forwards the identity params", async () => {
    const identity = { identifier: "1-start-line", callsign: "W1GBE" };
    SetStationIdentity.mockResolvedValue({ name: "Start Line" });

    const result = await invoke("set-station-identity", identity);

    expect(SetStationIdentity).toHaveBeenCalledWith(identity);
    expect(result).toEqual({ name: "Start Line" });
  });

  describe("get-station-operators", () => {
    it("returns just the operators when the station is found", () => {
      const operators = { primary: { fullname: "A", callsign: "B", phone: "1", active: true } };
      GetStationByIdentifier.mockReturnValue([{ operators }, DatabaseStatus.Success, "found"]);

      const result = invoke("get-station-operators", "1-start-line");

      expect(result).toEqual([operators, DatabaseStatus.Success, "found"]);
    });

    it("returns null when the station is not found", () => {
      GetStationByIdentifier.mockReturnValue([null, DatabaseStatus.NotFound, "not found"]);

      const result = invoke("get-station-operators", "unknown-station");

      expect(result).toEqual([null, DatabaseStatus.NotFound, "not found"]);
    });
  });
});
