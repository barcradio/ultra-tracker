import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppPaths,
  initUserDirectories,
  loadAthleteFile,
  loadDropsFromCSV,
  loadRunnersFromCSV,
  saveDropsToCSV,
  saveRunnersToCSV,
  selectEventArchiveFile,
  selectStationsFile
} from "../file-dialogs";

let documentsDir: string;

const dialog = vi.hoisted(() => ({
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn()
}));

const app = vi.hoisted(() => ({
  name: "ultra-tracker",
  getPath: vi.fn(() => "/tmp/ultra-tracker-documents")
}));

vi.mock("electron", () => ({ app, dialog }));

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
vi.mock("../store", () => ({ appStore: storeMock }));

describe("file-dialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMock.data.clear();
    storeMock.data.set("station.id", 3);
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ["/tmp/chosen.csv"] });
    dialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: "/tmp/export.csv" });
  });

  describe("open dialogs", () => {
    it("asks for a stations JSON file", async () => {
      await expect(selectStationsFile()).resolves.toEqual(["/tmp/chosen.csv"]);

      const config = dialog.showOpenDialog.mock.calls[0][0];
      expect(config.title).toBe("Select a starting Stations file");
      expect(config.filters[0].extensions).toEqual(["json"]);
      expect(config.properties).toEqual(["openFile"]);
    });

    it("asks for a zipped event file", async () => {
      await selectEventArchiveFile();

      const config = dialog.showOpenDialog.mock.calls[0][0];
      expect(config.title).toBe("Select an event file");
      expect(config.filters[0].extensions).toEqual(["zip"]);
    });

    it("asks for an athletes CSV", async () => {
      await loadAthleteFile();

      const config = dialog.showOpenDialog.mock.calls[0][0];
      expect(config.title).toBe("Select a starting athletes file");
      expect(config.filters[0].extensions).toEqual(["csv"]);
    });

    it("asks for a runners CSV", async () => {
      await loadRunnersFromCSV();

      expect(dialog.showOpenDialog.mock.calls[0][0].title).toBe("Select a runners file");
    });

    it("asks for a drops CSV", async () => {
      await loadDropsFromCSV();

      expect(dialog.showOpenDialog.mock.calls[0][0].title).toBe("Select a Drops file");
    });

    it("returns an empty selection when the operator cancels", async () => {
      dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

      await expect(selectStationsFile()).resolves.toEqual([]);
    });
  });

  describe("save dialogs", () => {
    it("suggests a runners export named after the station", async () => {
      await expect(saveRunnersToCSV()).resolves.toBe("/tmp/export.csv");

      const config = dialog.showSaveDialog.mock.calls[0][0];
      expect(config.defaultPath).toContain("Aid03Times");
    });

    it("suggests a drops export named after the station", async () => {
      await saveDropsToCSV();

      const config = dialog.showSaveDialog.mock.calls[0][0];
      expect(config.defaultPath).toContain("Aid03-drops");
    });

    it("pads a single-digit station number", async () => {
      storeMock.data.set("station.id", 7);

      await saveRunnersToCSV();

      expect(dialog.showSaveDialog.mock.calls[0][0].defaultPath).toContain("Aid07Times");
    });

    it("leaves a two-digit station number alone", async () => {
      storeMock.data.set("station.id", 12);

      await saveRunnersToCSV();

      expect(dialog.showSaveDialog.mock.calls[0][0].defaultPath).toContain("Aid12Times");
    });
  });

  describe("AppPaths", () => {
    it("places the app folders under the user's documents directory", () => {
      expect(AppPaths.userRoot).toContain("ultra-tracker");
      expect(AppPaths.eventConfig).toContain(".event-config");
    });
  });

  describe("initUserDirectories", () => {
    beforeEach(() => {
      documentsDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultra-tracker-docs-"));
    });

    afterEach(() => {
      fs.rmSync(documentsDir, { recursive: true, force: true });
    });

    it("creates every app directory that does not exist yet", () => {
      const created: string[] = [];
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockImplementation((target) => {
        created.push(String(target));
        return undefined;
      });

      initUserDirectories();

      expect(created).toHaveLength(Object.keys(AppPaths).length);
      vi.restoreAllMocks();
    });

    it("leaves directories that already exist alone", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      const mkdirSync = vi.spyOn(fs, "mkdirSync");

      initUserDirectories();

      expect(mkdirSync).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });
});
