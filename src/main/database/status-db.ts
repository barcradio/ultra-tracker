import { randomUUID } from "crypto";
import fs from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { parse } from "csv-parse";
import { getDatabaseConnection } from "./connect-db";
import { logEvent } from "./eventLogger-db";
import { clearPushStatus } from "./opensplittimeStatus-db";
import { alertForWatchlistedAthlete } from "./watchlist-db";
import {
  AthleteProgress,
  DatabaseStatus,
  DropReason,
  DropsImportConflictAction,
  DropsImportRecommendationConfidence
} from "../../shared/enums";
import { DropRecord, RunnerDB, StatusDB } from "../../shared/models";
import {
  ApplyDropsImportParams,
  DatabaseResponse,
  DropsImportConflict,
  DropsImportPreview,
  DropsImportPreviewRecord,
  DropsImportReport,
  DropsImportStatusValue
} from "../../shared/types";
import { emitRunnersTableChanged } from "../ipc/runner-data-emitter";
import { sendToastToRenderer } from "../ipc/toast-ipc";
import * as dialogs from "../lib/file-dialogs";
import { appStore } from "../lib/store";
import { pushTimeRecordUpdate } from "../services/opensplittime";

const invalidResult = -999;
const PENDING_DROPS_IMPORT_TTL_MS = 30 * 60 * 1000;

const dropsImportRecommendationReasons = {
  existingDns: "Existing DNS: preserve; the athlete did not start.",
  existingCourseDropForImportedDns: "Existing course drop: preserve over imported DNS.",
  conflictingStationAndTimestamp: "Station and timestamp disagree; review manually.",
  existingStationIsLater: "Existing drop is at a later station; preserve.",
  importedStationIsLater: "Imported drop is at a later station; use imported.",
  matchingStationAndReason: "Same station and reason; prefer the later timestamp.",
  manualReview: "No rule applies; review both records manually."
} as const;

interface PendingDropsImportConflict extends DropsImportConflict {
  importedRecord: DropRecord;
}

interface PendingDropsImport {
  sourceLabel: string;
  createdAt: number;
  totalRowCount: number;
  processedCount: number;
  invalidRowCount: number;
  importableRecords: DropRecord[];
  conflicts: PendingDropsImportConflict[];
  skippedFutureStationCount: number;
  duplicateCount: number;
}

const pendingDropsImports = new Map<string, PendingDropsImport>();

function removeExpiredPendingDropsImports(now = Date.now()): void {
  for (const [importId, pendingImport] of pendingDropsImports) {
    if (now - pendingImport.createdAt >= PENDING_DROPS_IMPORT_TTL_MS) {
      pendingDropsImports.delete(importId);
    }
  }
}

export async function LoadDrops() {
  const filePath = await SelectDropsFile();
  if (!filePath) throw new Error("No drops file selected");

  return LoadDropsFromFile(filePath);
}

export async function SelectDropsFile() {
  const dropsFilePath = await dialogs.loadDropsFromCSV();
  return dropsFilePath?.[0];
}

export async function LoadDropsFromFile(dropsFilePath: string) {
  const fileContent = fs.createReadStream(dropsFilePath, { encoding: "utf-8" });
  return parseDropsContent(fileContent, dropsFilePath);
}

export async function PreviewDropsFromFile(
  dropsFilePath: string
): Promise<DatabaseResponse<DropsImportPreview>> {
  const fileContent = fs.createReadStream(dropsFilePath, { encoding: "utf-8" });
  return previewDropsContent(fileContent, dropsFilePath);
}

export async function parseDropsContent(source: Readable, sourceLabel: string) {
  let message: string = "";
  let dropCount: number = 0;

  const parser = source
    .pipe(
      parse({
        delimiter: ",",
        fromLine: 3,
        // eslint-disable-next-line camelcase -- csv-parse names its own options in snake case
        relax_quotes: true,
        // eslint-disable-next-line camelcase -- csv-parse names its own options in snake case
        relax_column_count: true
      })
    )
    .on("data", (fields: string[]) => {
      const row: DropRecord = {
        stationId: fields[0] ?? "",
        bibId: Number(fields[1]),
        dropReason: fields[2] ?? "",
        dropDateTime: fields[3] ?? "",
        note: fields.slice(4).join(",")
      };

      if ((fields[1] ?? "").trim() === "" || !Number.isFinite(row.bibId)) return;

      // load a drop into the current station only if it occurred at an earlier or the current
      // station; the start-line is station 0, so did-not-start rows always pass this check
      const dropStationId = Number(row.stationId.split("-", 1)[0]);
      const stationId = appStore.get("station.id") as number;

      if (dropStationId <= stationId) {
        updateDropFromCSV(row);
        dropCount++;
      }
    })
    .on("error", (error) => {
      console.error(error);
      message = `Loading dropRecords: ${error.message}`;
      sendToastToRenderer({ message: error.message, type: "danger" });
    })
    .on("end", () => {
      const { records } = parser.info;
      message = `${sourceLabel}\r\n${records} dropRecords processed, ${dropCount} imported`;
    });
  await finished(parser);

  return message;
}

export async function previewDropsContent(
  source: Readable,
  sourceLabel: string
): Promise<DatabaseResponse<DropsImportPreview>> {
  try {
    removeExpiredPendingDropsImports();
    const { totalRowCount, processedCount, invalidRowCount, records } =
      await readDropsRecords(source);
    const db = getDatabaseConnection();
    const stationId = appStore.get("station.id") as number;
    const importId = randomUUID();
    const importableRecords: DropRecord[] = [];
    const conflicts: PendingDropsImportConflict[] = [];
    const readyRecords: DropsImportPreviewRecord[] = [];
    const skippedRecords: DropsImportPreviewRecord[] = [];
    const duplicateRecords: DropsImportPreviewRecord[] = [];
    let skippedFutureStationCount = 0;
    let duplicateCount = 0;
    const bibCounts = new Map<number, number>();

    for (const record of records) {
      bibCounts.set(record.bibId, (bibCounts.get(record.bibId) ?? 0) + 1);
    }

    for (const record of records) {
      const dropStationId = getStationOrder(record.stationId);
      if (dropStationId == null) {
        skippedRecords.push(makePreviewRecord(record, "Invalid station identifier"));
        continue;
      }

      if (dropStationId > stationId) {
        skippedFutureStationCount++;
        skippedRecords.push(makePreviewRecord(record, "Dropped at later station"));
        continue;
      }

      if (!isValidCSVDate(record.dropDateTime)) {
        skippedRecords.push(makePreviewRecord(record, "Invalid drop timestamp"));
        continue;
      }

      if ((bibCounts.get(record.bibId) ?? 0) > 1) {
        duplicateCount++;
        duplicateRecords.push(makePreviewRecord(record, "Duplicate bib in import file"));
        continue;
      }

      const existing = db.prepare(`SELECT * FROM Status WHERE bibId = ?`).get(record.bibId) as
        StatusDB | undefined;

      if (isExistingDropConflict(existing, record)) {
        const conflict = buildDropsImportConflict(record, existing);
        conflicts.push({ ...conflict, importedRecord: record });
        continue;
      }

      if (isDuplicateDrop(existing, record)) {
        duplicateCount++;
        duplicateRecords.push(makePreviewRecord(record, "Exact bib/status already exists"));
        continue;
      }

      importableRecords.push(record);
      readyRecords.push(makePreviewRecord(record, "Ready to import"));
    }

    pendingDropsImports.set(importId, {
      sourceLabel,
      createdAt: Date.now(),
      totalRowCount,
      processedCount,
      invalidRowCount,
      importableRecords,
      conflicts,
      skippedFutureStationCount,
      duplicateCount
    });

    const preview: DropsImportPreview = {
      importId,
      sourceLabel,
      totalRowCount,
      processedCount,
      invalidRowCount,
      importableCount: importableRecords.length,
      skippedFutureStationCount,
      duplicateCount,
      readyRecords,
      skippedRecords,
      duplicateRecords,
      conflicts: conflicts.map(({ importedRecord: _importedRecord, ...conflict }) => conflict)
    };

    return [preview, DatabaseStatus.Success, formatDropsImportPreviewMessage(preview)];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to preview drops file";
    console.error(message);
    sendToastToRenderer({ message, type: "danger" });
    return [null, DatabaseStatus.Error, message];
  }
}

export function applyDropsImport(
  params: ApplyDropsImportParams
): DatabaseResponse<DropsImportReport> {
  removeExpiredPendingDropsImports();
  const pendingImport = pendingDropsImports.get(params.importId);
  if (!pendingImport) return [null, DatabaseStatus.NotFound, "Drops import preview expired"];

  const decisions = new Map(
    params.decisions.map((decision) => [decision.conflictId, decision.action])
  );
  let importedCount = 0;
  let preservedCount = 0;

  try {
    const db = getDatabaseConnection();
    for (const conflict of pendingImport.conflicts) {
      const current = db.prepare(`SELECT * FROM Status WHERE bibId = ?`).get(conflict.bibId) as
        StatusDB | undefined;
      if (!current || !statusesMatch(getExistingStatus(current), conflict.existing)) {
        throw new Error(`Bib ${conflict.bibId} changed after the import was previewed`);
      }
    }

    const applyImport = db.transaction(() => {
      for (const record of pendingImport.importableRecords) {
        const [status, message] = updateDropFromCSV(record);
        if (status === DatabaseStatus.Error) throw new Error(message);
        importedCount++;
      }

      for (const conflict of pendingImport.conflicts) {
        const action = decisions.get(conflict.id) ?? DropsImportConflictAction.PreserveExisting;
        if (action === DropsImportConflictAction.UseImported) {
          const [status, message] = updateDropFromCSV(conflict.importedRecord);
          if (status === DatabaseStatus.Error) throw new Error(message);
          importedCount++;
        } else {
          preservedCount++;
        }
      }
    });

    applyImport();
    pendingDropsImports.delete(params.importId);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to apply drops import";
    console.error(message);
    return [null, DatabaseStatus.Error, message];
  }

  const report: DropsImportReport = {
    sourceLabel: pendingImport.sourceLabel,
    totalRowCount: pendingImport.totalRowCount,
    processedCount: pendingImport.processedCount,
    invalidRowCount: pendingImport.invalidRowCount,
    importedCount,
    preservedCount,
    skippedFutureStationCount: pendingImport.skippedFutureStationCount,
    duplicateCount: pendingImport.duplicateCount,
    conflictCount: pendingImport.conflicts.length
  };

  return [report, DatabaseStatus.Success, formatDropsImportReportMessage(report)];
}

export function discardDropsImport(importId: string): DatabaseResponse {
  removeExpiredPendingDropsImports();
  if (!pendingDropsImports.delete(importId)) {
    return [DatabaseStatus.NotFound, "Drops import preview expired"];
  }

  return [DatabaseStatus.Success, "Drops import discarded"];
}

export function GetStatusByBib(bibNumber: number): [StatusDB | null, DatabaseStatus, string] {
  return GetStatusFromColumn("bibId", bibNumber);
}

// A runner is "stopped here" for OST purposes when they have an active drop recorded at the current station.
export function getStoppedHereForBib(bibId: number): boolean {
  const [status] = GetStatusByBib(bibId);
  if (!status?.dropped) return false;

  const stationIdentifier = appStore.get("station.identifier") as string;
  return status.dropStation === stationIdentifier;
}

export function GetStatusFromColumn(
  columnName: string,
  value: unknown
): DatabaseResponse<StatusDB> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM Status WHERE ${columnName} = ?`).get(value);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null)
    return [
      null,
      DatabaseStatus.NotFound,
      `athletes: No status found with ${columnName}: ${value}`
    ];

  queryResult = queryResult as StatusDB;

  // map result to athlete object
  const athleteStatus: StatusDB = {
    bibId: queryResult.bibId,
    dropped: queryResult.dropped,
    dropReason: queryResult.dropReason,
    dropStation: queryResult.dropStation,
    dropDateTime: queryResult.dropDateTime,
    note: queryResult.note,
    progress: queryResult.progress
  };

  message = `athletes:Found status with bibId: ${athleteStatus.bibId}`;
  return [athleteStatus, DatabaseStatus.Success, message];
}

export function GetTotalDidNotStart(): number {
  const count = GetStatusCount("dropReason", `dropReason == '${DropReason.DidNotStart}'`);
  return count[0] == null ? invalidResult : count[0];
}

export function GetTotalDropped(): number {
  const count = GetStatusCount("dropped", `dropped == ${Number(true)}`);
  return count[0] == null ? invalidResult : count[0];
}

export function GetStationDropped(): number {
  let stationIdentifier: string | null = null;
  try {
    stationIdentifier = appStore.get("station.identifier") as string;
  } catch (e) {
    if (e instanceof Error) return invalidResult;
  }

  if (!stationIdentifier) return invalidResult;

  const count = GetStatusCount("dropped", `dropStation == '${stationIdentifier}'`);
  return count[0] == null ? invalidResult : count[0];
}

export function GetPreviousDropped(): number {
  const db = getDatabaseConnection();
  let stationId: number | null = null;

  try {
    stationId = appStore.get("station.id") as number;
  } catch (e) {
    if (e instanceof Error) return invalidResult;
  }

  if (stationId == null) return invalidResult;

  let queryResult;

  try {
    queryResult = db
      .prepare(`SELECT * FROM Status WHERE dropped == ? AND IFNULL(dropReason, '') != ?`)
      .all(Number(true), DropReason.DidNotStart);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return invalidResult;
    }
  }

  if (queryResult == null) return invalidResult;

  const droppedList = queryResult as StatusDB[];
  const previousDropped: StatusDB[] = [];

  for (const record of droppedList) {
    const id = Number(record.dropStation?.split("-", 1)[0]);
    if (id < stationId) previousDropped.push(record);
  }

  return previousDropped.length == null ? invalidResult : previousDropped.length;
}

export function SetDrop(
  bibId: number,
  timeOut: Date | null,
  droppedValue: boolean,
  dropReason: DropReason
): DatabaseResponse {
  const db = getDatabaseConnection();
  let message: string = "";
  let stationIdentifier: string | null = appStore.get("station.identifier") as string;
  let reason: DropReason | null = dropReason;
  const dropDateTime = !timeOut ? new Date().toISOString() : timeOut.toISOString();

  let timingRecord: RunnerDB | undefined;
  let previousDrop: { dropped: number } | undefined;

  try {
    timingRecord = db.prepare(`SELECT * FROM TimeRecords WHERE bibId = ?`).get(bibId) as
      RunnerDB | undefined;
    previousDrop = db.prepare(`SELECT dropped FROM Status WHERE bibId = ?`).get(bibId) as
      | {
          dropped: number;
        }
      | undefined;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
    return [DatabaseStatus.Error, "Unknown database error while checking drop status"];
  }

  if (!droppedValue) {
    stationIdentifier = null;
    reason = null;
  }

  try {
    const query = db.prepare(
      `UPDATE Status SET dropped = ?, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = ?`
    );
    query.run(Number(droppedValue), reason, stationIdentifier, dropDateTime, bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  logEvent(
    bibId,
    null,
    null,
    null,
    dropDateTime,
    `[Set](Drop): bib:${bibId}, value:${droppedValue}`,
    false,
    false
  );

  message = `status:update bibId: ${bibId}, dropped: ${droppedValue}, dropReason: ${dropReason}`;

  // Did-Not-Start drops never had a timing record, so skip the OpenSplitTime push entirely.
  if (
    dropReason !== DropReason.DidNotStart &&
    timingRecord &&
    previousDrop?.dropped !== Number(droppedValue)
  ) {
    // Clear the prior push outcome immediately so the UI shows "Pending" even if the push
    // below is skipped (paused/not signed in) or takes a while to resolve.
    db.prepare(`UPDATE TimeRecords SET sent = ? WHERE "bibId" = ?`).run(
      Number(false),
      timingRecord.bibId
    );
    clearPushStatus(bibId);
    emitRunnersTableChanged();

    void pushTimeRecordUpdate(timingRecord, droppedValue)
      .then((outcome) => {
        if (outcome.pushed) {
          db.prepare(`UPDATE TimeRecords SET sent = ? WHERE "bibId" = ?`).run(
            Number(true),
            timingRecord.bibId
          );
        }
      })
      .catch((error: unknown) => {
        console.error("OpenSplitTime drop update failed", error);
      });
  }

  return [DatabaseStatus.Updated, message];
}

function GetStatusCount(columnName: string, whereStatement: string): DatabaseResponse<number> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db
      .prepare(`SELECT COUNT(${columnName}) FROM Status WHERE ${whereStatement}`)
      .get() as Record<string, number> | undefined;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  const count = queryResult[`COUNT(${columnName})`];
  message = `GetCountFromAthletes Where '${whereStatement}':${count}`;

  return [count, DatabaseStatus.Success, message];
}

export function updateDropFromCSV(record: DropRecord): DatabaseResponse {
  const db = getDatabaseConnection();
  const droppedValue = Number(true);
  const dropDateTime = parseCSVDate(record.dropDateTime).toISOString();
  const verbose = false;

  try {
    const query = db.prepare(
      `UPDATE Status SET dropped = ?, dropReason = ?, dropStation = ?, dropDateTime = ? WHERE bibId = ?`
    );
    query.run(droppedValue, record.dropReason, record.stationId, dropDateTime, record.bibId);

    syncNoteWithStatus(record.bibId, record.note.replaceAll(",", ";"), -1, SyncDirection.Outgoing);

    logEvent(
      record.bibId,
      record.stationId,
      null,
      dropDateTime,
      dropDateTime,
      `[Set](Drop): bibId: ${record.bibId} reason: '${record.dropReason}' station: '${record.stationId}' note: '${record.note}'`,
      false,
      verbose
    );
    alertForWatchlistedAthlete(record.bibId, "drop");
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `athlete:update bibId: ${record.bibId}, dropped: ${droppedValue}, dropStation: ${record.stationId}, dropDateTime: ${dropDateTime}, note: ${record.note}`;
  return [DatabaseStatus.Updated, message];
}

async function readDropsRecords(source: Readable): Promise<{
  totalRowCount: number;
  processedCount: number;
  invalidRowCount: number;
  records: DropRecord[];
}> {
  const records: DropRecord[] = [];
  let processedCount = 0;

  const parser = source.pipe(
    parse({
      delimiter: ",",
      fromLine: 3,
      // eslint-disable-next-line camelcase -- csv-parse names its own options in snake case
      relax_quotes: true,
      // eslint-disable-next-line camelcase -- csv-parse names its own options in snake case
      relax_column_count: true
    })
  );

  parser.on("data", (fields: string[]) => {
    const row: DropRecord = {
      stationId: fields[0] ?? "",
      bibId: Number(fields[1]),
      dropReason: fields[2] ?? "",
      dropDateTime: fields[3] ?? "",
      note: fields.slice(4).join(",")
    };

    if ((fields[1] ?? "").trim() === "" || !Number.isFinite(row.bibId)) return;

    processedCount++;
    records.push(row);
  });

  await finished(parser);
  const totalRowCount = parser.info.records;
  return {
    totalRowCount,
    processedCount,
    invalidRowCount: totalRowCount - processedCount,
    records
  };
}

function getStationOrder(stationIdentifier: string | null | undefined): number | null {
  if (!stationIdentifier) return null;
  const order = Number(stationIdentifier.split("-", 1)[0]);
  return Number.isFinite(order) ? order : null;
}

function getImportedStatus(record: DropRecord): DropsImportStatusValue {
  return {
    dropReason: record.dropReason,
    dropStation: record.stationId,
    dropDateTime: truncateToSeconds(parseCSVDate(record.dropDateTime).toISOString())
  };
}

function getExistingStatus(status: StatusDB): DropsImportStatusValue {
  return {
    dropReason: status.dropReason ?? null,
    dropStation: status.dropStation ?? null,
    dropDateTime:
      status.dropDateTime == null ? null : truncateToSeconds(String(status.dropDateTime))
  };
}

// Drops files don't record milliseconds, so comparisons must ignore them to avoid false conflicts.
function truncateToSeconds(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
  date.setMilliseconds(0);
  return date.toISOString();
}

function isExistingDropConflict(
  status: StatusDB | undefined,
  record: DropRecord
): status is StatusDB {
  if (!status?.dropped) return false;
  return !isDuplicateDrop(status, record);
}

function isDuplicateDrop(status: StatusDB | undefined, record: DropRecord): boolean {
  if (!status?.dropped) return false;

  const imported = getImportedStatus(record);
  const existing = getExistingStatus(status);

  return (
    existing.dropReason === imported.dropReason &&
    existing.dropStation === imported.dropStation &&
    existing.dropDateTime === imported.dropDateTime
  );
}

function buildDropsImportConflict(record: DropRecord, status: StatusDB): DropsImportConflict {
  const existing = getExistingStatus(status);
  const imported = getImportedStatus(record);
  const recommendation = recommendDropsImportAction(existing, imported);

  return {
    id: `${record.bibId}:${existing.dropStation ?? "none"}:${imported.dropStation ?? "none"}:${randomUUID()}`,
    bibId: record.bibId,
    existing,
    imported,
    importedNote: record.note,
    ...recommendation
  };
}

function recommendDropsImportAction(
  existing: DropsImportStatusValue,
  imported: DropsImportStatusValue
): {
  recommendedAction: DropsImportConflictAction;
  recommendationReason: string;
  recommendationConfidence: DropsImportRecommendationConfidence;
} {
  const existingStationOrder = getStationOrder(existing.dropStation);
  const importedStationOrder = getStationOrder(imported.dropStation);
  const existingIsDns = existing.dropReason === DropReason.DidNotStart;
  const importedIsDns = imported.dropReason === DropReason.DidNotStart;
  const existingIsCourseDrop = Boolean(existing.dropReason && !existingIsDns);
  const importedIsCourseDrop = Boolean(imported.dropReason && !importedIsDns);

  if (existingIsDns && importedIsCourseDrop) {
    return {
      recommendedAction: DropsImportConflictAction.PreserveExisting,
      recommendationReason: dropsImportRecommendationReasons.existingDns,
      recommendationConfidence: DropsImportRecommendationConfidence.High
    };
  }

  if (existingIsCourseDrop && importedIsDns) {
    return {
      recommendedAction: DropsImportConflictAction.PreserveExisting,
      recommendationReason: dropsImportRecommendationReasons.existingCourseDropForImportedDns,
      recommendationConfidence: DropsImportRecommendationConfidence.Medium
    };
  }

  if (
    existingIsCourseDrop &&
    importedIsCourseDrop &&
    existingStationOrder != null &&
    importedStationOrder != null &&
    stationOrderContradictsTimestamps(
      existingStationOrder,
      importedStationOrder,
      existing.dropDateTime,
      imported.dropDateTime
    )
  ) {
    return {
      recommendedAction: DropsImportConflictAction.PreserveExisting,
      recommendationReason: dropsImportRecommendationReasons.conflictingStationAndTimestamp,
      recommendationConfidence: DropsImportRecommendationConfidence.Low
    };
  }

  if (
    existingIsCourseDrop &&
    importedIsCourseDrop &&
    existingStationOrder != null &&
    importedStationOrder != null &&
    existingStationOrder > importedStationOrder
  ) {
    return {
      recommendedAction: DropsImportConflictAction.PreserveExisting,
      recommendationReason: dropsImportRecommendationReasons.existingStationIsLater,
      recommendationConfidence: DropsImportRecommendationConfidence.Medium
    };
  }

  if (
    existingIsCourseDrop &&
    importedIsCourseDrop &&
    existingStationOrder != null &&
    importedStationOrder != null &&
    importedStationOrder > existingStationOrder
  ) {
    return {
      recommendedAction: DropsImportConflictAction.UseImported,
      recommendationReason: dropsImportRecommendationReasons.importedStationIsLater,
      recommendationConfidence: DropsImportRecommendationConfidence.Medium
    };
  }

  if (
    existing.dropStation === imported.dropStation &&
    existing.dropReason === imported.dropReason
  ) {
    return {
      recommendedAction: isImportedTimeLater(existing.dropDateTime, imported.dropDateTime)
        ? DropsImportConflictAction.UseImported
        : DropsImportConflictAction.PreserveExisting,
      recommendationReason: dropsImportRecommendationReasons.matchingStationAndReason,
      recommendationConfidence: DropsImportRecommendationConfidence.Medium
    };
  }

  return {
    recommendedAction: DropsImportConflictAction.PreserveExisting,
    recommendationReason: dropsImportRecommendationReasons.manualReview,
    recommendationConfidence: DropsImportRecommendationConfidence.Low
  };
}

function isImportedTimeLater(existingTime: string | null, importedTime: string | null): boolean {
  const existingTimestamp = existingTime == null ? Number.NaN : Date.parse(existingTime);
  const importedTimestamp = importedTime == null ? Number.NaN : Date.parse(importedTime);

  if (!Number.isFinite(importedTimestamp)) return false;
  if (!Number.isFinite(existingTimestamp)) return true;
  return importedTimestamp > existingTimestamp;
}

function stationOrderContradictsTimestamps(
  existingStationOrder: number,
  importedStationOrder: number,
  existingTime: string | null,
  importedTime: string | null
): boolean {
  const existingTimestamp = existingTime == null ? Number.NaN : Date.parse(existingTime);
  const importedTimestamp = importedTime == null ? Number.NaN : Date.parse(importedTime);
  if (!Number.isFinite(existingTimestamp) || !Number.isFinite(importedTimestamp)) return false;

  const importedStationIsLater = importedStationOrder > existingStationOrder;
  const importedTimeIsLater = importedTimestamp > existingTimestamp;
  if (importedStationOrder === existingStationOrder || importedTimestamp === existingTimestamp) {
    return false;
  }

  return importedStationIsLater !== importedTimeIsLater;
}

function isValidCSVDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function statusesMatch(first: DropsImportStatusValue, second: DropsImportStatusValue): boolean {
  return (
    first.dropReason === second.dropReason &&
    first.dropStation === second.dropStation &&
    first.dropDateTime === second.dropDateTime
  );
}

function makePreviewRecord(record: DropRecord, reason: string): DropsImportPreviewRecord {
  return {
    bibId: record.bibId,
    reason,
    status: record.dropReason,
    station: record.stationId,
    dateTime: record.dropDateTime,
    note: record.note || null
  };
}

function formatDropsImportPreviewMessage(preview: DropsImportPreview): string {
  return `${preview.sourceLabel}\r\n${preview.totalRowCount} rows read, ${preview.processedCount} valid records, ${preview.invalidRowCount} invalid rows, ${preview.importableCount} ready to import, ${preview.conflicts.length} conflicts`;
}

function formatDropsImportReportMessage(report: DropsImportReport): string {
  return `${report.sourceLabel}\r\n${report.totalRowCount} rows read, ${report.processedCount} valid records, ${report.invalidRowCount} invalid rows, ${report.importedCount} imported, ${report.preservedCount} preserved, ${report.skippedFutureStationCount} skipped`;
}

function parseCSVDate(timingDate: string): Date {
  const event = new Date(Date.parse(timingDate));
  return event;
}

// TODO: refactor to always get status from its table
export function syncNoteWithStatus(
  bibId: number,
  note: string,
  index: number,
  direction: SyncDirection
) {
  const db = getDatabaseConnection();
  const statusResult = GetStatusByBib(bibId);
  let combinedNote: string = "";

  // An athlete missing from the roster has no Status row, but their timing record still needs the
  // note, so carry on with an empty status note and skip only the Status write below.
  const hasStatus = statusResult[1] == DatabaseStatus.Success;
  const status = statusResult[0];
  const statusNote = status?.note == undefined ? "" : status?.note;

  switch (direction) {
    case SyncDirection.Incoming:
      combinedNote = !note ? "" : note.replaceAll(",", "").trimStart();
      break;

    case SyncDirection.Outgoing:
      combinedNote = !note ? "" : note.replaceAll(",", "");
      combinedNote = !note ? "" : note.replaceAll(statusNote, "");
      combinedNote = statusNote.concat(" ", combinedNote).trimStart();
      break;
  }

  try {
    //trying to protect against settings notes across multiple records of the same bibId, e.g. many duplicates
    if (index != -1) {
      db.prepare(`UPDATE TimeRecords SET note = ? WHERE "bibId" = ? and "index" = ?`).run(
        combinedNote,
        bibId,
        index
      );
    }
    if (hasStatus)
      db.prepare(`UPDATE Status SET note = ? WHERE "bibId" = ?`).run(combinedNote, bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `[sync][note](status<->timingRecord) bib:${bibId} note: ${combinedNote}`;
  return [DatabaseStatus.Updated, message];
}

export enum SyncDirection {
  Incoming,
  Outgoing
}

export function SetProgress(bibId: number): DatabaseResponse {
  const db = getDatabaseConnection();
  let message: string = "";
  let queryResult: { timeIn: string | null; timeOut: string | null } | undefined;
  let status: AthleteProgress;

  const query = `SELECT Status.*, TimeRecords.timeIn, TimeRecords.timeOut
       FROM "Status" LEFT JOIN "TimeRecords"
       ON Status.bibId = TimeRecords.bibId
       WHERE Status.bibId == ?`;

  try {
    queryResult = db.prepare(query).get(bibId) as typeof queryResult;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [DatabaseStatus.NotFound, message];

  const timeIn = queryResult.timeIn == undefined ? null : queryResult.timeIn;
  const timeOut = queryResult.timeOut == undefined ? null : queryResult.timeOut;

  if (timeIn == null && timeOut == null) {
    status = AthleteProgress.Incoming;
  } else if (timeIn != null && timeOut == null) {
    status = AthleteProgress.Present;
  } else {
    status = AthleteProgress.Outgoing;
  }

  try {
    const stmt = db.prepare(`UPDATE Status SET progress = ? WHERE bibId = ?`);
    stmt.run(status, bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  message = `Status:set Progress bibId: ${bibId}, value: ${AthleteProgress[status].toString()}`;
  return [DatabaseStatus.Updated, message];
}

export function initStatus(bibId: number) {
  const status: StatusDB = {
    bibId: bibId,
    dropped: false,
    dropReason: undefined,
    dropStation: undefined,
    dropDateTime: null,
    note: undefined,
    progress: AthleteProgress.Incoming
  };

  insertStatus(status);
}

export function insertStatus(status: StatusDB): DatabaseResponse {
  const db = getDatabaseConnection();
  const bibId: number = status.bibId;
  const dropped: number = Number(status.dropped);
  const dropReason = status.dropReason;
  const dropStation = status.dropStation;
  const dropDateTime = status.dropDateTime;
  const note = status.note;
  const progress = status.progress;

  const statusRecord = GetStatusByBib(bibId);
  if (statusRecord[0] != null) {
    const message = `status:duplicate ${bibId}, ${dropped}, '${note}', ${progress}`;
    return [DatabaseStatus.Duplicate, message];
  }

  try {
    const query = db.prepare(
      `INSERT INTO Status (bibId, dropped, dropReason, dropStation, dropDateTime, note, progress) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    query.run(bibId, dropped, dropReason, dropStation, dropDateTime, note, progress);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `status:add ${bibId}, ${dropped}, '${note}', ${progress}`;
  return [DatabaseStatus.Created, message];
}
