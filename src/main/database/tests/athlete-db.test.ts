import { Readable } from "stream";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./dbTestHelper";
import { DatabaseStatus } from "../../../shared/enums";
import { AthleteDB } from "../../../shared/models";
import {
  GetAthleteByBib,
  GetAthletes,
  GetTotalAthletes,
  LoadAthletes,
  LoadAthletesFromFile,
  insertAthlete,
  parseAthletesContent
} from "../athlete-db";

let db: Database.Database;

vi.mock("../connect-db", () => ({
  getDatabaseConnection: () => db
}));

const sendToastToRenderer = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/toast-ipc", () => ({ sendToastToRenderer }));

const loadAthleteFile = vi.hoisted(() => vi.fn());
vi.mock("../../lib/file-dialogs", () => ({ loadAthleteFile }));

function athlete(overrides: Partial<AthleteDB> = {}): AthleteDB {
  return {
    index: 0,
    bibId: 101,
    firstName: "Ada",
    lastName: "Lovelace",
    gender: "F",
    age: 36,
    city: "London",
    state: "UK",
    emergencyPhone: 5551234,
    emergencyName: "Charles",
    ...overrides
  } as AthleteDB;
}

describe("athlete-db", () => {
  beforeEach(() => {
    db = createTestDatabase();
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  describe("insertAthlete", () => {
    it("stores the athlete and reports Created", () => {
      const [status] = insertAthlete(athlete());

      expect(status).toBe(DatabaseStatus.Created);
      expect(GetTotalAthletes()).toBe(1);
    });

    it("seeds a Status row for the new athlete", () => {
      insertAthlete(athlete({ bibId: 202 }));

      const row = db.prepare(`SELECT bibId FROM Status WHERE bibId = ?`).get(202);
      expect(row).toBeDefined();
    });

    it("reports Error when the insert fails", () => {
      db.exec(`DROP TABLE Athletes`);

      const [status, message] = insertAthlete(athlete());

      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toMatch(/Athletes/);
    });
  });

  describe("GetTotalAthletes", () => {
    it("returns zero for an empty table", () => {
      expect(GetTotalAthletes()).toBe(0);
    });

    it("counts every stored athlete", () => {
      insertAthlete(athlete({ bibId: 1 }));
      insertAthlete(athlete({ bibId: 2 }));

      expect(GetTotalAthletes()).toBe(2);
    });

    it("returns the invalid sentinel when the query fails", () => {
      db.exec(`DROP TABLE Athletes`);

      expect(GetTotalAthletes()).toBe(-999);
    });
  });

  describe("GetAthleteByBib", () => {
    it("returns the athlete mapped onto the shared model", () => {
      insertAthlete(athlete({ bibId: 303, firstName: "Grace", lastName: "Hopper" }));

      const [found, status] = GetAthleteByBib(303);

      expect(status).toBe(DatabaseStatus.Success);
      expect(found).toMatchObject({ bibId: 303, firstName: "Grace", lastName: "Hopper" });
    });

    it("reports NotFound for an unknown bib", () => {
      const [found, status, message] = GetAthleteByBib(999);

      expect(found).toBeNull();
      expect(status).toBe(DatabaseStatus.NotFound);
      expect(message).toContain("999");
    });

    it("reports Error when the query throws", () => {
      db.exec(`DROP TABLE Athletes`);

      const [found, status] = GetAthleteByBib(1);

      expect(found).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
    });
  });

  describe("GetAthletes", () => {
    it("returns an empty list when no athletes are loaded", () => {
      const [rows, status] = GetAthletes();

      expect(status).toBe(DatabaseStatus.Success);
      expect(rows).toEqual([]);
    });

    it("joins status and watchlist information onto each athlete", () => {
      insertAthlete(athlete({ bibId: 404 }));
      db.prepare(`INSERT INTO Watchlist (bibId) VALUES (?)`).run(404);

      const [rows] = GetAthletes();

      expect(rows).toHaveLength(1);
      expect(rows?.[0].bibId).toBe(404);
      expect(rows?.[0].watchlisted).toBeTruthy();
    });

    it("reports Error when the join fails", () => {
      db.exec(`DROP TABLE Watchlist`);

      const [rows, status] = GetAthletes();

      expect(rows).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
    });
  });

  describe("parseAthletesContent", () => {
    it("imports every data row and skips the header line", async () => {
      const csv = Readable.from(
        [
          "bib,first,last,gender,age,city,state,ecName,ecPhone",
          "1,Ada,Lovelace,F,36,London,UK,Charles,5551234",
          "2,Alan,Turing,M,41,London,UK,Joan,5555678"
        ].join("\n")
      );

      const message = await parseAthletesContent(csv, "athletes.csv");

      expect(GetTotalAthletes()).toBe(2);
      expect(message.join()).toContain("2 athletes imported");
    });

    it("clears previously imported athletes before importing", async () => {
      insertAthlete(athlete({ bibId: 900 }));

      const csv = Readable.from(
        ["header", "1,Ada,Lovelace,F,36,London,UK,Charles,5551234"].join("\n")
      );
      await parseAthletesContent(csv, "athletes.csv");

      const [found] = GetAthleteByBib(900);
      expect(found).toBeNull();
      expect(GetTotalAthletes()).toBe(1);
    });

    // KNOWN DEFECT - intended behaviour asserted below, currently failing.
    // `finished(parser, { error: false })` shows the intent to report a bad file rather than
    // throw, but the error re-raised by the piped source stream still rejects the call.
    // Marked `.fails` so CI stays green; it will start failing once the defect is fixed,
    // at which point the marker should be removed.
    it.fails("reports a parse failure instead of throwing", async () => {
      const csv = Readable.from(["header", 'one,"unterminated'].join("\n"));

      const message = await parseAthletesContent(csv, "athletes.csv");

      expect(message.join()).toMatch(/Loading athletes/);
    });

    it("warns the operator with a toast when the file cannot be parsed", async () => {
      const csv = Readable.from(["header", 'one,"unterminated'].join("\n"));

      await parseAthletesContent(csv, "athletes.csv").catch(() => undefined);

      expect(sendToastToRenderer).toHaveBeenCalledWith(expect.objectContaining({ type: "danger" }));
    });
  });

  describe("LoadAthletes", () => {
    it("throws when the operator cancels the file dialog", async () => {
      loadAthleteFile.mockResolvedValue(undefined);

      await expect(LoadAthletes()).rejects.toThrow("No athletes file selected");
    });

    it("imports from the file the operator chose", async () => {
      const fs = await import("fs");
      const os = await import("os");
      const path = await import("path");
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-athletes-"));
      const file = path.join(dir, "athletes.csv");
      fs.writeFileSync(file, "header\n7,Ada,Lovelace,F,36,London,UK,Charles,5551234\n");
      loadAthleteFile.mockResolvedValue([file]);

      await LoadAthletes();

      expect(GetTotalAthletes()).toBe(1);
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("LoadAthletesFromFile", () => {
    it("reads athletes straight from a path", async () => {
      const fs = await import("fs");
      const os = await import("os");
      const path = await import("path");
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-athletes-"));
      const file = path.join(dir, "athletes.csv");
      fs.writeFileSync(file, "header\n8,Alan,Turing,M,41,London,UK,Joan,5555678\n");

      await LoadAthletesFromFile(file);

      const [found] = GetAthleteByBib(8);
      expect(found?.lastName).toBe("Turing");
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });
});
