import fs from "fs";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseStatus } from "../../../shared/enums";
import {
  importEventArchiveFile,
  previewEventArchiveFile,
  reloadEventArchiveFile
} from "../event-archive-db";

let workDir: string;

const connect = vi.hoisted(() => ({
  createDatabaseFile: vi.fn(),
  resolveUniqueSlug: vi.fn((slug: string) => slug),
  // Mirrors connect-db's slugify: lowercase, hyphenate, and trim stray hyphens.
  slugify: vi.fn((name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  )
}));
vi.mock("../connect-db", () => connect);

const stations = vi.hoisted(() => ({
  parseStationsContent: vi.fn(async () => "1 stations imported"),
  previewStationsContent: vi.fn(() => [{ identifier: "3-hardware" }]),
  readEventNameFromStationsContent: vi.fn(() => "Bear 100")
}));
vi.mock("../stations-db", () => stations);

const parseAthletesContent = vi.hoisted(() => vi.fn(async () => ["2 athletes imported"]));
vi.mock("../athlete-db", () => ({ parseAthletesContent }));

const parseDropsContent = vi.hoisted(() => vi.fn(async () => "drops imported"));
vi.mock("../status-db", () => ({ parseDropsContent }));

const selectEventArchiveFile = vi.hoisted(() => vi.fn());
vi.mock("../../lib/file-dialogs", () => ({ selectEventArchiveFile }));

function makeArchive(
  entries: Record<string, string> = {
    "stations.json": '{"event":{"name":"Bear 100"},"stations":[]}',
    "athletes.csv": "header\n1,Ada,Lovelace,F,36,London,UK,Charles,5551234\n",
    "drops.csv": "title\nheader\n1-start,101,withdrew,2026-09-01T06:00:00Z,\n"
  },
  name = "event.zip"
) {
  const zip = new AdmZip();
  for (const [entry, content] of Object.entries(entries)) {
    zip.addFile(entry, Buffer.from(content, "utf-8"));
  }
  const target = path.join(workDir, name);
  zip.writeZip(target);
  return target;
}

describe("event-archive-db", () => {
  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-archive-"));
    vi.clearAllMocks();
    // These stubs are given rejections/return values by individual tests, so restore the
    // happy-path implementation for every one of them.
    stations.parseStationsContent.mockResolvedValue("1 stations imported");
    parseAthletesContent.mockResolvedValue(["2 athletes imported"]);
    parseDropsContent.mockResolvedValue("drops imported");
    selectEventArchiveFile.mockResolvedValue(undefined);
    stations.readEventNameFromStationsContent.mockReturnValue("Bear 100");
    stations.previewStationsContent.mockReturnValue([{ identifier: "3-hardware" }] as never);
    connect.resolveUniqueSlug.mockImplementation((slug: string) => slug);
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  describe("previewEventArchiveFile", () => {
    it("reports the event name and its stations without importing anything", () => {
      const archive = makeArchive();

      const [preview, status] = previewEventArchiveFile(archive);

      expect(status).toBe(DatabaseStatus.Success);
      expect(preview).toMatchObject({ archiveFilePath: archive, eventName: "Bear 100" });
      expect(connect.createDatabaseFile).not.toHaveBeenCalled();
    });

    it("reports an unreadable archive", () => {
      const notAZip = path.join(workDir, "broken.zip");
      fs.writeFileSync(notAZip, "not a zip file");

      const [preview, status] = previewEventArchiveFile(notAZip);

      expect(preview).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
    });

    it("names the required files that are missing", () => {
      const archive = makeArchive({ "drops.csv": "title\nheader\n" });

      const [, status, message] = previewEventArchiveFile(archive);

      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toContain("stations.json");
      expect(message).toContain("athletes.csv");
    });

    it("reports a stations file it cannot understand", () => {
      const archive = makeArchive();
      stations.readEventNameFromStationsContent.mockImplementation(() => {
        throw new Error("Stations file is missing an event name");
      });

      const [preview, status, message] = previewEventArchiveFile(archive);

      expect(preview).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toBe("Stations file is missing an event name");
    });
  });

  describe("importEventArchiveFile", () => {
    it("creates a database named after the event and imports every file", async () => {
      const archive = makeArchive();

      const [slug, status] = await importEventArchiveFile(archive);

      expect(status).toBe(DatabaseStatus.Created);
      expect(slug).toBe("bear-100");
      expect(connect.createDatabaseFile).toHaveBeenCalledWith("bear-100");
      expect(stations.parseStationsContent).toHaveBeenCalled();
      expect(parseAthletesContent).toHaveBeenCalled();
      expect(parseDropsContent).toHaveBeenCalled();
    });

    it("imports an archive with no drops file", async () => {
      const archive = makeArchive({
        "stations.json": '{"event":{"name":"Bear 100"},"stations":[]}',
        "athletes.csv": "header\n1,Ada,Lovelace,F,36,London,UK,Charles,5551234\n"
      });

      const [, status] = await importEventArchiveFile(archive);

      expect(status).toBe(DatabaseStatus.Created);
      expect(parseDropsContent).not.toHaveBeenCalled();
    });

    it("avoids colliding with an existing database of the same name", async () => {
      connect.resolveUniqueSlug.mockReturnValue("bear-100-2");
      const archive = makeArchive();

      const [slug] = await importEventArchiveFile(archive);

      expect(slug).toBe("bear-100-2");
    });

    it("falls back to a generic name when the event name has no usable characters", async () => {
      stations.readEventNameFromStationsContent.mockReturnValue("!!!");
      const archive = makeArchive();

      await importEventArchiveFile(archive);

      expect(connect.resolveUniqueSlug).toHaveBeenCalledWith("event");
    });

    it("reports an unreadable archive", async () => {
      const notAZip = path.join(workDir, "broken.zip");
      fs.writeFileSync(notAZip, "not a zip file");

      const [slug, status] = await importEventArchiveFile(notAZip);

      expect(slug).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
    });

    it("reports a failure part-way through the import", async () => {
      stations.parseStationsContent.mockRejectedValue(new Error("stations blew up"));
      const archive = makeArchive();

      const [slug, status, message] = await importEventArchiveFile(archive);

      expect(slug).toBeNull();
      expect(status).toBe(DatabaseStatus.Error);
      expect(message).toBe("stations blew up");
    });
  });

  describe("reloadEventArchiveFile", () => {
    it("reloads the supplied archive into the open database", async () => {
      const archive = makeArchive();

      const message = await reloadEventArchiveFile(archive);

      expect(message).toBe('Reloaded event file "Bear 100"');
      expect(connect.createDatabaseFile).not.toHaveBeenCalled();
      expect(stations.parseStationsContent).toHaveBeenCalled();
    });

    it("asks the operator to pick a file when none is supplied", async () => {
      const archive = makeArchive();
      selectEventArchiveFile.mockResolvedValue([archive]);

      await reloadEventArchiveFile();

      expect(selectEventArchiveFile).toHaveBeenCalled();
    });

    it("throws when the operator cancels", async () => {
      selectEventArchiveFile.mockResolvedValue(undefined);

      await expect(reloadEventArchiveFile()).rejects.toThrow("No event file selected");
    });

    it("throws when the archive cannot be read", async () => {
      const notAZip = path.join(workDir, "broken.zip");
      fs.writeFileSync(notAZip, "not a zip file");

      await expect(reloadEventArchiveFile(notAZip)).rejects.toThrow();
    });

    it("throws when a file inside the archive fails to import", async () => {
      parseAthletesContent.mockRejectedValue(new Error("athletes blew up"));
      const archive = makeArchive();

      await expect(reloadEventArchiveFile(archive)).rejects.toThrow("athletes blew up");
    });
  });
});
