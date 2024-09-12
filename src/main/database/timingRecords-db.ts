import appSettings from "electron-settings";
import { DatabaseResponse } from "$shared/types";
import * as dbAthletes from "./athlete-db";
import { getDatabaseConnection } from "./connect-db";
import { logEvent } from "./eventLogger-db";
import { DatabaseStatus, RecordStatus, RecordType } from "../../shared/enums";
import { RunnerDB } from "../../shared/models";

interface TypedRunnerDB extends RunnerDB {
  recordType: RecordType;
}

export function insertOrUpdateTimeRecord(record: RunnerDB): DatabaseResponse {
  let status: DatabaseStatus = DatabaseStatus.Error;
  let message: string = "";

  // identify type of change
  const incomingRecord: TypedRunnerDB = checkRecordType(record);
  const bibSearch = getTimeRecordbyBib(record)[0];
  const recordWithBib = bibSearch ? checkRecordType(bibSearch) : bibSearch;
  const indexSearch = getTimeRecordbyIndex(record)[0];
  const recordWithIndex = indexSearch ? checkRecordType(indexSearch) : indexSearch;

  // new record
  if (!recordWithBib && !recordWithIndex) {
    incomingRecord.status = RecordStatus.OK;
    [status, message] = insertTimeRecord(incomingRecord);
  }

  // previous record with bib found
  if (recordWithBib && !recordWithIndex) {
    if (
      ((recordWithBib.timeIn && incomingRecord.recordType == RecordType.Out) ||
        (recordWithBib.timeOut && incomingRecord.recordType == RecordType.In)) &&
      recordWithBib.recordType != RecordType.InOut
    ) {
      incomingRecord.status = RecordStatus.OK; // adding opposite time, not a duplicate
      incomingRecord.note = recordWithBib.note.concat(" ", incomingRecord.note); // preserve note
      [status, message] = updateTimeRecord(incomingRecord, recordWithBib, true);
    } else {
      incomingRecord.status = RecordStatus.Duplicate; // this is a true duplicate
      [status, message] = insertTimeRecord(incomingRecord);
    }
  }

  // only record with index exists, probably updating bib number on correct record, merge them
  if (!recordWithBib && recordWithIndex) {
    incomingRecord.status = RecordStatus.OK;
    [status, message] = updateTimeRecord(incomingRecord, recordWithIndex, true);
  }

  //both queries succeed exist and are equal, but the incoming object is not, we are updating normally, replace don't merge
  if (recordWithBib && recordWithIndex) {
    if (JSON.stringify(recordWithBib) === JSON.stringify(recordWithIndex)) {
      if (JSON.stringify(incomingRecord) !== JSON.stringify(recordWithIndex)) {
        incomingRecord.status = RecordStatus.OK;
        [status, message] = updateTimeRecord(incomingRecord, recordWithIndex, false);
      }
    } else {
      //we are updating the current record, but it is still duplicating another record!
      incomingRecord.status = RecordStatus.Duplicate;
      [status, message] = updateTimeRecord(incomingRecord, recordWithIndex, false);
    }
  }

  console.log(message);
  return [status, message];
}

function checkRecordType(record: RunnerDB): TypedRunnerDB {
  let type!: RecordType;
  if (record.timeIn && record.timeOut) type = RecordType.InOut as RecordType;
  if (record.timeIn && !record.timeOut) type = RecordType.In as RecordType;
  if (!record.timeIn && record.timeOut) type = RecordType.Out as RecordType;

  return { ...record, recordType: type };
}

export function getTimeRecordbyBib(record: RunnerDB): DatabaseResponse<RunnerDB> {
  const db = getDatabaseConnection();
  let queryString = "";
  let queryResult;
  let message: string = "";

  queryString = `SELECT * FROM StationEvents WHERE bibId = ?`;
  try {
    const query = db.prepare(queryString);
    queryResult = query.get(record.bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, message];
    }
  }

  if (queryResult == null || queryResult.bibId != record.bibId)
    return [null, DatabaseStatus.NotFound, message];

  queryResult = queryResult as RunnerDB;
  message = `timing-record:Found timeRecord with bib: ${queryResult.bibId}`;
  return [queryResult, DatabaseStatus.Success, message];
}

export function getTimeRecordbyIndex(record: RunnerDB): DatabaseResponse<RunnerDB> {
  const db = getDatabaseConnection();
  let queryString = "";
  let queryResult;
  let message: string = "";

  queryString = `SELECT * FROM StationEvents WHERE "index" = ?`;
  try {
    const query = db.prepare(queryString);
    queryResult = query.get(record.index);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [queryResult, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [queryResult, DatabaseStatus.NotFound, message];

  queryResult = queryResult as RunnerDB;
  message = `timing-record:Found timeRecord with index: ${queryResult.index}`;
  console.log(message);
  return [queryResult, DatabaseStatus.Success, message];
}

export function deleteTimeRecord(record: RunnerDB): DatabaseResponse {
  const db = getDatabaseConnection();
  let queryString = "";

  const searchResult = getTimeRecordbyIndex(record);

  if (searchResult != null) {
    queryString = `DELETE FROM StationEvents WHERE "index" = ?`;
    try {
      const query = db.prepare(queryString);
      query.run(record.index);
      return [DatabaseStatus.Deleted, `timing-record:delete ${record.index}`];
    } catch (e) {
      if (e instanceof Error) {
        console.error(e.message);
        return [DatabaseStatus.Error, e.message];
      }
    }
  }

  return [DatabaseStatus.NotFound, `timing-record:delete Bib ${record.bibId} not found`];
}

function updateTimeRecord(
  record: TypedRunnerDB,
  existingRecord: TypedRunnerDB,
  merge: boolean
): DatabaseResponse {
  const db = getDatabaseConnection();
  const stationId = appSettings.getSync("station.id") as number;
  const stationIdentifier = appSettings.getSync("station.identifier") as string;
  let queryString = "";

  // scrub any string values coming from the UI
  if (record.timeIn instanceof String) record.timeIn = null;
  if (record.timeOut instanceof String) record.timeOut = null;
  if (record.timeModified instanceof String) record.timeModified = null;

  // preserve the prior and opposite times when from input, don't merge when it is an edit
  if (merge) {
    if (existingRecord.timeIn != null && record.timeIn == null)
      record.timeIn = new Date(existingRecord.timeIn);
    if (existingRecord.timeOut != null && record.timeOut == null)
      record.timeOut = new Date(existingRecord.timeOut);
  }

  //build the time record
  processDuplicate(record);
  const stationID = stationId;
  const timeInISO = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO = record.timeModified == null ? null : record.timeModified.toISOString();
  const sent = Number(record.sent);
  const status = Number(record.status);
  const verbose = false;

  try {
    // if bib number is changing, then update by index
    if (existingRecord != null && existingRecord.bibId != record.bibId) {
      queryString = `UPDATE StationEvents SET bibId = ?, stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, sent = ?, status = ? WHERE "index" = ?`;
      const query = db.prepare(queryString);
      query.run(
        record.bibId,
        stationID,
        timeInISO,
        timeOutISO,
        modifiedISO,
        sent,
        status,
        record.index
      );

      dbAthletes.syncAthleteNote(record.bibId, record.note, dbAthletes.SyncDirection.Incoming);

      logEvent(
        record.bibId,
        stationIdentifier,
        timeInISO,
        timeOutISO,
        modifiedISO,
        `[Update](Time): bibId:(${existingRecord.bibId})->(${record.bibId}), ${RecordStatus[record.status]}, merge:${merge}`,
        record.sent,
        verbose
      );
    } else {
      queryString = `UPDATE StationEvents SET stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, sent = ?, status = ? WHERE bibId = ?`;
      const query = db.prepare(queryString);
      query.run(stationID, timeInISO, timeOutISO, modifiedISO, sent, status, record.bibId);
      dbAthletes.syncAthleteNote(record.bibId, record.note, dbAthletes.SyncDirection.Incoming);
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `timing-record:update ${record.bibId}, ${timeInISO}, ${timeOutISO}, ${modifiedISO}, '${record.note}'`;
  return [DatabaseStatus.Updated, message];
}

function insertTimeRecord(record: TypedRunnerDB): DatabaseResponse {
  const db = getDatabaseConnection();
  const stationId = appSettings.getSync("station.id") as number;
  const stationIdentifier = appSettings.getSync("station.identifier") as string;

  //build the time record
  processDuplicate(record);
  const stationID = stationId;
  const timeInISO = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO = record.timeModified == null ? null : record.timeModified.toISOString();
  const sent = Number(record.sent);
  const status = Number(record.status);
  const verbose = false;

  try {
    const stmt = db.prepare(
      `INSERT INTO StationEvents (bibId, stationId, timeIn, timeOut, timeModified, sent, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(record.bibId, stationID, timeInISO, timeOutISO, modifiedISO, sent, status);

    if (record.status == RecordStatus.Duplicate) {
      setTimingRecordNote(record.bibId, record.note);
    } else {
      dbAthletes.syncAthleteNote(record.bibId, record.note, dbAthletes.SyncDirection.Outgoing);
    }

    logEvent(
      record.bibId,
      stationIdentifier,
      timeInISO,
      timeOutISO,
      modifiedISO,
      `[Add](Time): bibId:(${record.bibId}), ${RecordStatus[record.status]}`,
      record.sent,
      verbose
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `timing-record:add ${record.bibId}, ${timeInISO}, ${timeOutISO}, ${modifiedISO}, '${record.note}'`;
  return [DatabaseStatus.Created, message];
}

export function setTimingRecordNote(bibId: number, note: string) {
  const db = getDatabaseConnection();
  const incomingNote = !note ? "" : note.replaceAll(",", "").trimStart();

  try {
    db.prepare(`UPDATE StationEvents SET note = ? WHERE "bibId" = ?`).run(incomingNote, bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `[set][note](timingRecord) bib:${bibId} note: ${incomingNote}`;
  return [DatabaseStatus.Updated, message];
}

export function markTimeRecordAsSent(bibId: number, value: boolean) {
  const db = getDatabaseConnection();

  try {
    db.prepare(`UPDATE StationEvents SET sent = ? WHERE "bibId" = ?`).run(Number(value), bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `timing-record:sent ${bibId}`;
  return [DatabaseStatus.Created, message];
}

function processDuplicate(record: TypedRunnerDB): TypedRunnerDB {
  if (record.status == RecordStatus.Duplicate) {
    record.bibId = Number(record.bibId) + 0.2;
    const typeStr = RecordType[record.recordType];
    record.note = `[Duplicate:${typeStr}] ` + record.note;
  }
  return record;
}
