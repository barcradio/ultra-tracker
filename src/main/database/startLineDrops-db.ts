import Database from "better-sqlite3";
import { getDatabaseConnection } from "./connect-db";
import { exportDropsAsCSV } from "./runners-db";
import { SetDrop } from "./status-db";
import { insertOrUpdateTimeRecord } from "./timingRecords-db";
import { DatabaseStatus, DropReason, RecordStatus } from "../../shared/enums";
import { DatabaseResponse, StartLineDropsPreview, StartLineDropsReport } from "../../shared/types";
import { IsRFIDScanning } from "../api/rfid-processor";
import { emitRunnersTableChanged } from "../ipc/runner-data-emitter";
import { appStore } from "../lib/store";
import { getAuthStatus, setOpenSplitTimePushPaused } from "../services/opensplittime";

function isCurrentStationStartLine(): boolean {
  const identifier = appStore.get("station.identifier") as string;
  const startline = appStore.get("event.startline") as string;
  return Boolean(startline) && identifier === startline;
}

// Shared by preview and generate so neither can run from a disabled/stale renderer button.
function getStartLinePreconditionError(): string | null {
  if (!isCurrentStationStartLine()) {
    return "Start line drops can only be generated at the start line station.";
  }

  if (IsRFIDScanning()) {
    return "Stop the RFID reader before generating start line drops.";
  }

  return null;
}

// exportDropsAsCSV() only ever returns a plain message string, so its outcome has to be
// classified here to tell the renderer whether the drops CSV actually needs to be retried.
function classifyExportMessage(message: string): "success" | "cancelled" | "error" {
  if (message === "Invalid file name") return "cancelled";
  if (message.startsWith("File Export Successful:")) return "success";
  return "error";
}

function getStartLineData(db: Database.Database) {
  const stationId = appStore.get("station.id") as number;

  const registeredBibIds = (
    db.prepare(`SELECT bibId FROM Athletes`).all() as { bibId: number }[]
  ).map((row) => row.bibId);

  const timeRecords = db
    .prepare(`SELECT bibId, status FROM TimeRecords WHERE stationId = ?`)
    .all(stationId) as { bibId: number; status: number }[];

  const startedBibIds = new Set(timeRecords.map((record) => record.bibId));
  const registeredBibIdSet = new Set(registeredBibIds);

  const duplicateBibIds = [
    ...new Set(
      timeRecords
        .filter((record) => record.status === RecordStatus.Duplicate)
        .map((record) => record.bibId)
    )
  ];

  const unknownBibIds = [...startedBibIds].filter((bibId) => !registeredBibIdSet.has(bibId));

  const alreadyDroppedBibIds = new Set(
    (db.prepare(`SELECT bibId FROM Status WHERE dropped = 1`).all() as { bibId: number }[]).map(
      (row) => row.bibId
    )
  );

  const newDropBibIds = registeredBibIds.filter(
    (bibId) => !startedBibIds.has(bibId) && !alreadyDroppedBibIds.has(bibId)
  );

  return {
    registeredBibIds,
    startedBibIds,
    alreadyDroppedBibIds,
    duplicateBibIds,
    unknownBibIds,
    newDropBibIds
  };
}

export function previewStartLineDrops(): DatabaseResponse<StartLineDropsPreview> {
  const preconditionError = getStartLinePreconditionError();
  if (preconditionError) return [null, DatabaseStatus.Error, preconditionError];

  try {
    const db = getDatabaseConnection();
    const data = getStartLineData(db);

    const preview: StartLineDropsPreview = {
      registeredCount: data.registeredBibIds.length,
      startedCount: data.startedBibIds.size,
      alreadyDroppedCount: data.alreadyDroppedBibIds.size,
      newDropCount: data.newDropBibIds.length,
      duplicateBibIds: data.duplicateBibIds,
      unknownBibIds: data.unknownBibIds
    };

    return [preview, DatabaseStatus.Success, "Start line drops preview generated"];
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to preview start line drops";
    console.error(message);
    return [null, DatabaseStatus.Error, message];
  }
}

export async function generateStartLineDrops(
  startLineClosedConfirmed: boolean
): Promise<DatabaseResponse<StartLineDropsReport>> {
  const preconditionError = getStartLinePreconditionError();
  if (preconditionError) return [null, DatabaseStatus.Error, preconditionError];

  if (!startLineClosedConfirmed) {
    return [
      null,
      DatabaseStatus.Error,
      "Confirm the start line is officially closed before generating drops."
    ];
  }

  let db: Database.Database;
  let data: ReturnType<typeof getStartLineData>;

  try {
    db = getDatabaseConnection();
    data = getStartLineData(db);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to generate start line drops";
    console.error(message);
    return [null, DatabaseStatus.Error, message];
  }

  if (data.duplicateBibIds.length > 0) {
    return [
      null,
      DatabaseStatus.Error,
      `Resolve duplicate start line records before generating drops: ${data.duplicateBibIds.join(", ")}`
    ];
  }

  if (data.unknownBibIds.length > 0) {
    return [
      null,
      DatabaseStatus.Error,
      `Reload the event file to add unknown bib(s) before generating drops: ${data.unknownBibIds.join(", ")}`
    ];
  }

  // Fall back to now only if the event start time was never configured.
  const startTime = (appStore.get("event.starttime") as string) || new Date().toISOString();

  // Pushes are already paused by default until a real sign-in occurs, and pausing still
  // requires a valid token, so skip the call entirely when signed out.
  if (getAuthStatus().authenticated) setOpenSplitTimePushPaused(true);

  try {
    const applyDrops = db.transaction((bibIds: number[]) => {
      const stationId = appStore.get("station.id") as number;
      const dropTime = new Date(startTime);

      for (const bibId of bibIds) {
        // Give the bib a row in the grid (with the next sequence number) since it never scanned in.
        const [insertStatus, insertMessage] = insertOrUpdateTimeRecord({
          index: 0,
          bibId,
          stationId,
          timeIn: dropTime,
          timeOut: dropTime,
          timeModified: dropTime,
          note: "",
          sent: false,
          status: RecordStatus.OK
        });
        if (insertStatus === DatabaseStatus.Error) throw new Error(insertMessage);

        const [status, message] = SetDrop(bibId, dropTime, true, DropReason.DidNotStart);
        if (status === DatabaseStatus.Error) throw new Error(message);
      }
    });

    applyDrops(data.newDropBibIds);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to generate start line drops";
    return [null, DatabaseStatus.Error, message];
  }

  // SetDrop() skips this for DropReason.DidNotStart since there is no timing record to refresh.
  if (data.newDropBibIds.length > 0) emitRunnersTableChanged();

  const exportMessage = await exportDropsAsCSV();
  const exportStatus = classifyExportMessage(exportMessage);

  return [
    { newDropCount: data.newDropBibIds.length, exportMessage, exportStatus },
    DatabaseStatus.Success,
    `Generated ${data.newDropBibIds.length} start line drops`
  ];
}
