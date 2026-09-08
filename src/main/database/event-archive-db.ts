import { Readable } from "stream";
import AdmZip from "adm-zip";
import { DatabaseStatus } from "$shared/enums";
import { DatabaseResponse } from "$shared/types";
import { parseAthletesContent } from "./athlete-db";
import { createDatabaseFile, resolveUniqueSlug, slugify } from "./connect-db";
import { parseStationsContent, readEventNameFromStationsContent } from "./stations-db";
import { parseDropsContent } from "./status-db";

const STATIONS_ENTRY = "stations.json";
const ATHLETES_ENTRY = "athletes.csv";
const DROPS_ENTRY = "drops.csv";

export async function importEventArchiveFile(
  archiveFilePath: string
): Promise<DatabaseResponse<string>> {
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

  try {
    const stationsJson = stationsEntry.getData().toString("utf-8");
    const eventName = readEventNameFromStationsContent(stationsJson);
    const slug = resolveUniqueSlug(slugify(eventName) || "event");

    createDatabaseFile(slug);
    await parseStationsContent(stationsJson, STATIONS_ENTRY);
    await parseAthletesContent(Readable.from(athletesEntry.getData()), ATHLETES_ENTRY);

    if (dropsEntry) {
      await parseDropsContent(Readable.from(dropsEntry.getData()), DROPS_ENTRY);
    }

    return [slug, DatabaseStatus.Created, `Created event database "${slug}"`];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to import event file";
    return [null, DatabaseStatus.Error, message];
  }
}
