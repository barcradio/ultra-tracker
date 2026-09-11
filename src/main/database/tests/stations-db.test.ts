import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { DatabaseStatus } from "../../../shared/enums";
import { Station } from "../../../shared/models";
import {
  GetStationByIdentifier,
  GetStations,
  LoadStations,
  SetStationIdentity,
  formatDate,
  insertStation,
  loadStationsFromFile,
  parseStationsContent,
  previewStationsContent,
  readEventNameFromStationsContent,
  readEventNameFromStationsFile,
  setStation
} from "../stations-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({
  getDatabaseConnection: () => db
}));

const storeMock = vi.hoisted(() => {
  const data = new Map<string, unknown>();
  return {
    data,
    get: vi.fn((key: string) => data.get(key)),
    set: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    })
  };
});
vi.mock("../../lib/store", () => ({ appStore: storeMock }));

const selectStationsFile = vi.hoisted(() => vi.fn());
vi.mock("../../lib/file-dialogs", () => ({ selectStationsFile }));

const syncSplitEntryKinds = vi.hoisted(() => vi.fn());
vi.mock("../../services/opensplittime", () => ({ syncSplitEntryKinds }));

function station(overrides: Partial<Station> = {}): Station {
  return {
    name: "Hardware Ranch",
    identifier: "3-hardware",
    description: "Aid station",
    location: { latitude: 41.5, longitude: -111.8, elevation: 5600 },
    distance: 21.4,
    dropbags: true,
    crewaccess: false,
    paceraccess: true,
    shiftBegin: new Date("2026-09-01T06:00:00Z"),
    cutofftime: new Date("2026-09-01T18:00:00Z"),
    shiftEnd: new Date("2026-09-01T20:00:00Z"),
    entrymode: 0,
    operators: {
      primary: { fullname: "Ada Lovelace", callsign: "K7ADA", phone: "555-1234" },
      secondary: { fullname: "Alan Turing", callsign: "K7ALN", phone: "555-5678" }
    },
    ...overrides
  } as Station;
}

function stationsFile(stations: Station[] = [station()], eventName = "Bear 100") {
  return JSON.stringify({
    event: {
      name: eventName,
      starttime: "2026-09-01T06:00:00Z",
      endtime: "2026-09-02T18:00:00Z"
    },
    stations
  });
}

describe("stations-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
    storeMock.data.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  describe("formatDate", () => {
    it("returns an empty string for a null date", () => {
      expect(formatDate(null)).toBe("");
    });

    it("formats a date as time and day", () => {
      expect(formatDate(new Date("2026-09-01T13:45:07"))).toBe("13:45:07 01 Sep 2026");
    });
  });

  describe("insertStation / GetStations", () => {
    it("returns an empty list before any station is imported", () => {
      const [rows, status] = GetStations();

      expect(status).toBe(DatabaseStatus.Success);
      expect(rows).toEqual([]);
    });

    it("stores a station and reports Created", () => {
      const [status] = insertStation(station());

      expect(status).toBe(DatabaseStatus.Created);
      expect(GetStations()[0]).toHaveLength(1);
    });

    it("reports Error when the insert fails", () => {
      db.exec(`DROP TABLE Stations`);

      const [status] = insertStation(station());

      expect(status).toBe(DatabaseStatus.Error);
    });

    it("reports Error when the read fails", () => {
      db.exec(`DROP TABLE Stations`);

      const [rows, status] = GetStations();

      expect(rows).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
    });
  });

  describe("GetStationByIdentifier", () => {
    it("maps the stored row back onto a station object", () => {
      insertStation(station());

      const [found, status] = GetStationByIdentifier("3-hardware");

      expect(status).toBe(DatabaseStatus.Success);
      expect(found).toMatchObject({ name: "Hardware Ranch", identifier: "3-hardware" });
      expect(found?.location.latitude).toBe(41.5);
      expect(found?.location.elevation).toBe(5600);
      expect(found?.operators.primary.callsign).toBe("K7ADA");
    });

    it("reports NotFound for an unknown identifier", () => {
      const [found, status] = GetStationByIdentifier("99-nowhere");

      expect(found).toBeNull();
      expect(status).toBe(DatabaseStatus.NotFound);
    });

    it("reports Error when the query fails", () => {
      db.exec(`DROP TABLE Stations`);

      const [found, status] = GetStationByIdentifier("3-hardware");

      expect(found).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
    });
  });

  describe("readEventNameFromStationsContent", () => {
    it("reads the event name", () => {
      expect(readEventNameFromStationsContent(stationsFile())).toBe("Bear 100");
    });

    it("throws when the event name is missing", () => {
      expect(() => readEventNameFromStationsContent(JSON.stringify({ event: {} }))).toThrow(
        "Stations file is missing an event name"
      );
    });

    it("reads the event name from a file on disk", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-stations-"));
      const file = path.join(dir, "stations.json");
      fs.writeFileSync(file, stationsFile([station()], "Wasatch 100"));

      expect(readEventNameFromStationsFile(file)).toBe("Wasatch 100");
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("previewStationsContent", () => {
    it("returns the stations without touching the database", () => {
      const stations = previewStationsContent(stationsFile());

      expect(stations).toHaveLength(1);
      expect(GetStations()[0]).toEqual([]);
    });

    it("throws on malformed JSON", () => {
      expect(() => previewStationsContent("{not json")).toThrow(/Error parsing JSON file/);
    });

    it("throws when the stations array is missing", () => {
      expect(() => previewStationsContent(JSON.stringify({ event: { name: "x" } }))).toThrow(
        "Stations file is missing stations"
      );
    });
  });

  describe("parseStationsContent", () => {
    it("imports stations and records the event in the store", async () => {
      const message = await parseStationsContent(stationsFile(), "stations.json");

      expect(message).toContain("1 stations imported");
      expect(storeMock.data.get("event.name")).toBe("Bear 100");
      expect(GetStations()[0]).toHaveLength(1);
    });

    it("marks the first and last stations as the start and finish lines", async () => {
      const start = station({ identifier: "1-start", name: "Start" });
      const finish = station({ identifier: "9-finish", name: "Finish" });

      await parseStationsContent(stationsFile([start, finish]), "stations.json");

      expect(storeMock.data.get("event.startline")).toBe("1-start");
      expect(storeMock.data.get("event.finishline")).toBe("9-finish");
    });

    it("writes a single EventMeta row describing the event", async () => {
      await parseStationsContent(stationsFile(), "stations.json");

      const rows = db.prepare(`SELECT * FROM EventMeta`).all() as Array<{ name: string }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Bear 100");
    });

    it("replaces stations from a previous import instead of appending", async () => {
      await parseStationsContent(stationsFile(), "stations.json");
      await parseStationsContent(
        stationsFile([station({ identifier: "4-other" })]),
        "stations.json"
      );

      expect(GetStations()[0]).toHaveLength(1);
    });

    it("hydrates OpenSplitTime split entry kinds", async () => {
      await parseStationsContent(stationsFile(), "stations.json");

      expect(syncSplitEntryKinds).toHaveBeenCalled();
    });

    it("keeps importing when the OpenSplitTime sync fails", async () => {
      syncSplitEntryKinds.mockRejectedValueOnce(new Error("network down"));

      const message = await parseStationsContent(stationsFile(), "stations.json");

      expect(message).toContain("1 stations imported");
    });

    it("defaults the OpenSplitTime settings when the file omits them", async () => {
      await parseStationsContent(stationsFile(), "stations.json");

      expect(storeMock.data.get("event.openSplitTime")).toEqual({
        production: { name: "", id: 0 },
        staging: { name: "", id: 0 }
      });
    });
  });

  describe("loadStationsFromFile / LoadStations", () => {
    it("imports stations from a path", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-stations-"));
      const file = path.join(dir, "stations.json");
      fs.writeFileSync(file, stationsFile());

      const message = await loadStationsFromFile(file);

      expect(message).toContain("1 stations imported");
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("imports the file chosen in the dialog", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-stations-"));
      const file = path.join(dir, "stations.json");
      fs.writeFileSync(file, stationsFile());
      selectStationsFile.mockResolvedValue([file]);

      await LoadStations();

      expect(GetStations()[0]).toHaveLength(1);
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("setStation", () => {
    it("does nothing when the identifier is unknown", async () => {
      await setStation("99-nowhere");

      expect(storeMock.data.get("station.name")).toBeUndefined();
    });

    it("records the selected station and its operators in the store", async () => {
      insertStation(station());

      await setStation("3-hardware");

      expect(storeMock.data.get("station.name")).toBe("Hardware Ranch");
      expect(storeMock.data.get("station.id")).toBe(3);
      expect(storeMock.data.get("station.operators.primary.callsign")).toBe("K7ADA");
      expect(storeMock.data.get("station.operators.primary.active")).toBe(true);
      expect(storeMock.data.get("station.operators.secondary.active")).toBe(false);
    });

    it("falls back to the station name when no split name override exists", async () => {
      insertStation(station());

      await setStation("3-hardware");

      expect(storeMock.data.get("station.openSplitTimeSplitName")).toBe("Hardware Ranch");
    });

    it("prefers a configured OpenSplitTime split name override", async () => {
      insertStation(station());
      storeMock.data.set("event.openSplitTime.splitNames", { "3-hardware": "Hardware Ranch Aid" });

      await setStation("3-hardware");

      expect(storeMock.data.get("station.openSplitTimeSplitName")).toBe("Hardware Ranch Aid");
    });
  });

  describe("SetStationIdentity", () => {
    it("activates only the operator matching the callsign", async () => {
      insertStation(station());
      storeMock.data.set("station", station());

      await SetStationIdentity({ identifier: "3-hardware", callsign: "K7ALN" });

      expect(storeMock.data.get("station.operators.secondary.active")).toBe(true);
      expect(storeMock.data.get("station.operators.primary.active")).toBe(false);
    });
  });
});
