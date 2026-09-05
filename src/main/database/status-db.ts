import fs from "fs";
import { finished } from "stream/promises";
import { parse } from "csv-parse";
import { getDatabaseConnection } from "./connect-db";
import { logEvent } from "./eventLogger-db";
import { clearPushStatus } from "./opensplittimeStatus-db";
import { alertForWatchlistedAthlete } from "./watchlist-db";
import { AthleteProgress, DatabaseStatus, DropReason } from "../../shared/enums";
import { DropRecord, RunnerDB, StatusDB } from "../../shared/models";
import { DatabaseResponse } from "../../shared/types";
import { emitRunnersTableChanged } from "../ipc/runner-data-emitter";
import { sendToastToRenderer } from "../ipc/toast-ipc";
import * as dialogs from "../lib/file-dialogs";
import { appStore } from "../lib/store";
import { pushTimeRecordUpdate } from "../services/opensplittime";

const invalidResult = -999;

export async function LoadDrops() {
  const headers = ["stationId", "bibId", "dropReason", "dropDateTime", "note"];
  const dropsFilePath = await dialogs.loadDropsFromCSV();
  const fileContent = fs.createReadStream(dropsFilePath[0], { encoding: "utf-8" });
  let message: string = "";
  let dropCount: number = 0;

  const parser = fileContent
    .pipe(
      parse({
        delimiter: ",",
        columns: headers,
        fromLine: 3
      })
    )
    .on("data", (row) => {
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
      message = `${dropsFilePath}\r\n${records} dropRecords processed, ${dropCount} imported`;
    });
  await finished(parser);

  return message;
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
  console.log(message);
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
    queryResult = db.prepare(`SELECT * FROM Status WHERE dropped == ?`).all(Number(true));
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
  const timingRecord = db.prepare(`SELECT * FROM TimeRecords WHERE bibId = ?`).get(bibId) as
    RunnerDB | undefined;
  const previousDrop = db.prepare(`SELECT dropped FROM Status WHERE bibId = ?`).get(bibId) as
    | {
        dropped: number;
      }
    | undefined;

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
