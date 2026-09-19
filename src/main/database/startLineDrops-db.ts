import Database from "better-sqlite3";
import { getDatabaseConnection } from "./connect-db";
import { exportDropsAsCSV } from "./runners-db";
import { SetDrop } from "./status-db";
import { DatabaseStatus, DropReason, RecordStatus } from "../../shared/enums";
import { DatabaseResponse, StartLineDropsPreview, StartLineDropsReport } from "../../shared/types";
import { appStore } from "../lib/store";
import { setOpenSplitTimePushPaused } from "../services/opensplittime";

function isCurrentStationStartLine(): boolean {
  const identifier = appStore.get("station.identifier") as string;
  const startline = appStore.get("event.startline") as string;
  return Boolean(startline) && identifier === startline;
}

function getStartLineData(db: Database.Database) {
  const stationId = appStore.get("station.id") as number;

  const registeredBibIds = (
    db.prepare(`SELECT bibId FROM Athletes`).all() as { bibId: number }[]
  ).map((row) => row.bibId);

  const timeRecords = db
    .prepare(`SELECT bibId, status FROM TimeRecords WHERE stationId = ? AND timeIn IS NOT NULL`)
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
  if (!isCurrentStationStartLine()) {
    return [
      null,
      DatabaseStatus.Error,
      "Start line drops can only be generated at the start line station."
    ];
  }

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
}

export async function generateStartLineDrops(): Promise<DatabaseResponse<StartLineDropsReport>> {
  if (!isCurrentStationStartLine()) {
    return [
      null,
      DatabaseStatus.Error,
      "Start line drops can only be generated at the start line station."
    ];
  }

  const db = getDatabaseConnection();
  const data = getStartLineData(db);

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

  setOpenSplitTimePushPaused(true);

  try {
    const applyDrops = db.transaction((bibIds: number[]) => {
      for (const bibId of bibIds) {
        const [status, message] = SetDrop(bibId, new Date(startTime), true, DropReason.DidNotStart);
        if (status === DatabaseStatus.Error) throw new Error(message);
      }
    });

    applyDrops(data.newDropBibIds);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to generate start line drops";
    return [null, DatabaseStatus.Error, message];
  }

  const exportMessage = await exportDropsAsCSV();

  return [
    { newDropCount: data.newDropBibIds.length, exportMessage },
    DatabaseStatus.Success,
    `Generated ${data.newDropBibIds.length} start line drops`
  ];
}
