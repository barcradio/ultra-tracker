import { Readable } from "stream";
import AdmZip from "adm-zip";
import { DatabaseStatus } from "$shared/enums";
import { DatabaseResponse, EventArchivePreview } from "$shared/types";
import { parseAthletesContent } from "./athlete-db";
import { createDatabaseFile, resolveUniqueSlug, slugify } from "./connect-db";
import {
  parseStationsContent,
  previewStationsContent,
  readEventNameFromStationsContent
} from "./stations-db";
import { parseDropsContent } from "./status-db";
import { selectEventArchiveFile } from "../lib/file-dialogs";

const STATIONS_ENTRY = "stations.json";
const ATHLETES_ENTRY = "athletes.csv";
const DROPS_ENTRY = "drops.csv";

interface EventArchiveEntries {
  stationsEntry: AdmZip.IZipEntry;
  athletesEntry: AdmZip.IZipEntry;
  dropsEntry: AdmZip.IZipEntry | null;
}

function readEventArchiveEntries(archiveFilePath: string): DatabaseResponse<EventArchiveEntries> {
  let zip: AdmZip;
  try {
    zip = new AdmZip(archiveFilePath);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to open event file";
    return [null, DatabaseStatus.Error, message];
  }

  const stationsEntry = zip.getEntry(STATIONS_ENTRY);
  const athletesEntry = zip.getEntry(ATHLETES_ENTRY);
  const dropsEntry = zip.getEntry(DROPS_ENTRY);

  if (!stationsEntry || !athletesEntry) {
    const missing = [!stationsEntry && STATIONS_ENTRY, !athletesEntry && ATHLETES_ENTRY]
      .filter(Boolean)
      .join(", ");
    return [null, DatabaseStatus.Error, `Event file is missing required file(s): ${missing}`];
  }

  return [{ stationsEntry, athletesEntry, dropsEntry }, DatabaseStatus.Success, ""];
}

export function previewEventArchiveFile(
  archiveFilePath: string
): DatabaseResponse<EventArchivePreview> {
  const [entries, status, message] = readEventArchiveEntries(archiveFilePath);
  if (!entries) return [null, status, message];

  try {
    const stationsJson = entries.stationsEntry.getData().toString("utf-8");
    const eventName = readEventNameFromStationsContent(stationsJson);
    const stations = previewStationsContent(stationsJson);

    return [
      { archiveFilePath, eventName, stations },
      DatabaseStatus.Success,
      `Loaded event file "${eventName}"`
    ];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to preview event file";
    return [null, DatabaseStatus.Error, message];
  }
}

export async function importEventArchiveFile(
  archiveFilePath: string
): Promise<DatabaseResponse<string>> {
  const [entries, status, message] = readEventArchiveEntries(archiveFilePath);
  if (!entries) return [null, status, message];

  try {
    const stationsJson = entries.stationsEntry.getData().toString("utf-8");
    const eventName = readEventNameFromStationsContent(stationsJson);
    const slug = resolveUniqueSlug(slugify(eventName) || "event");

    createDatabaseFile(slug);
    await parseStationsContent(stationsJson, STATIONS_ENTRY);
    await parseAthletesContent(Readable.from(entries.athletesEntry.getData()), ATHLETES_ENTRY);

    if (entries.dropsEntry) {
      await parseDropsContent(Readable.from(entries.dropsEntry.getData()), DROPS_ENTRY);
    }

    return [slug, DatabaseStatus.Created, `Created event database "${slug}"`];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to import event file";
    return [null, DatabaseStatus.Error, message];
  }
}

export async function reloadEventArchiveFile(archiveFilePath?: string): Promise<string> {
  let filePath = archiveFilePath;
  if (!filePath) {
    const filePaths = await selectEventArchiveFile();
    filePath = filePaths?.[0];
  }

  if (!filePath) {
    throw new Error("No event file selected");
  }

  const [entries, , message] = readEventArchiveEntries(filePath);
  if (!entries) {
    throw new Error(message || "Unable to read event file");
  }

  try {
    const stationsJson = entries.stationsEntry.getData().toString("utf-8");
    const eventName = readEventNameFromStationsContent(stationsJson);

    await parseStationsContent(stationsJson, STATIONS_ENTRY);
    await parseAthletesContent(Readable.from(entries.athletesEntry.getData()), ATHLETES_ENTRY);

    if (entries.dropsEntry) {
      await parseDropsContent(Readable.from(entries.dropsEntry.getData()), DROPS_ENTRY);
    }

    return `Reloaded event file "${eventName}"`;
  } catch (e: unknown) {
    const errMessage = e instanceof Error ? e.message : "Unable to reload event file";
    throw new Error(errMessage);
  }
}
