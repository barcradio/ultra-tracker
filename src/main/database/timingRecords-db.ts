import { DatabaseResponse } from "$shared/types";
import * as dbAthletes from "./athlete-db";
import { getDatabaseConnection } from "./connect-db";
import { logEvent } from "./eventLogger-db";
import { DatabaseStatus, EntryMode, RecordStatus, RecordType } from "../../shared/enums";
import { RunnerDB } from "../../shared/models";
import { appStore } from "../lib/store";

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
  const stationEntryMode = appStore.get("station.entrymode") as number;

  // new record
  if (!recordWithBib && !recordWithIndex) {
    incomingRecord.status = RecordStatus.OK;
    if (stationEntryMode == EntryMode.Fast) forceFastMode(incomingRecord);

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
      if (stationEntryMode == EntryMode.Fast) forceFastMode(incomingRecord);
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
        incomingRecord.bibId % 1 == 0
          ? (incomingRecord.status = RecordStatus.OK)
          : (incomingRecord.status = RecordStatus.Duplicate);
        [status, message] = updateTimeRecord(incomingRecord, recordWithIndex, false);
      }
    } else {
      //we are updating the current record, but it is still duplicating another record, update the existing!
      incomingRecord.status = RecordStatus.Duplicate;
      [status, message] = updateTimeRecord(incomingRecord, recordWithIndex, false);
    }
  }

  console.log(message);
  return [status, message];
}

function forceFastMode(record: RunnerDB): TypedRunnerDB {
  const type: RecordType = RecordType.InOut;

  if (record.timeIn && !record.timeOut) record.timeOut = record.timeIn;
  if (!record.timeIn && record.timeOut) record.timeIn = record.timeOut;

  return { ...record, recordType: type };
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
  const stationId = appStore.get("station.id") as number;
  const stationIdentifier = appStore.get("station.identifier") as string;
  let queryString = "";

  scrubStringsFromRenderer(record);
  preserveOrMergeTimes(merge, existingRecord, record);
  processDuplicate(record);

  //build the time record
  const stationID = stationId;
  const timeInISO = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO = record.timeModified == null ? null : record.timeModified.toISOString();
  const sent = Number(record.sent);
  const status = record.status;
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
        existingRecord.index
      );
    } else {
      // if bib is not changing, ensure we have correct record by index and bib
      queryString = `UPDATE StationEvents SET stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, sent = ?, status = ? WHERE bibId = ? and "index" = ?`;
      const query = db.prepare(queryString);
      query.run(
        stationID,
        timeInISO,
        timeOutISO,
        modifiedISO,
        sent,
        status,
        record.bibId,
        existingRecord.index
      );
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  processNote(record, dbAthletes.SyncDirection.Incoming);
  dbAthletes.SetStatusOnAthlete(record.bibId);
  const eventLogMessage = `[Update](Time): bibId:(${existingRecord.bibId})->(${record.bibId}), ${RecordStatus[record.status]}, merge:${merge}`;
  logEvent(
    record.bibId,
    stationIdentifier,
    timeInISO,
    timeOutISO,
    modifiedISO,
    eventLogMessage,
    record.sent,
    verbose
  );

  const message = `timing-record:update ${record.bibId}, ${timeInISO}, ${timeOutISO}, ${modifiedISO}, '${record.note}'`;

  if (record.status == RecordStatus.Duplicate) return [DatabaseStatus.Duplicate, message];

  return [DatabaseStatus.Updated, message];
}

function insertTimeRecord(record: TypedRunnerDB): DatabaseResponse {
  const db = getDatabaseConnection();
  const stationId = appStore.get("station.id") as number;
  const stationIdentifier = appStore.get("station.identifier") as string;

  //build the time record
  processDuplicate(record);
  const stationID = stationId;
  const timeInISO = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO = record.timeModified == null ? null : record.timeModified.toISOString();
  const sent = Number(record.sent);
  const status = record.status;
  const verbose = false;

  try {
    const stmt = db.prepare(
      `INSERT INTO StationEvents (bibId, stationId, timeIn, timeOut, timeModified, sent, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(record.bibId, stationID, timeInISO, timeOutISO, modifiedISO, sent, status);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  processNote(record, dbAthletes.SyncDirection.Outgoing);
  dbAthletes.SetStatusOnAthlete(record.bibId);
  const eventLogMessage = `[Add](Time): bibId:(${record.bibId}), ${RecordStatus[record.status]}`;
  logEvent(
    record.bibId,
    stationIdentifier,
    timeInISO,
    timeOutISO,
    modifiedISO,
    eventLogMessage,
    record.sent,
    verbose
  );

  const message = `timing-record:add ${record.bibId}, ${timeInISO}, ${timeOutISO}, ${modifiedISO}, '${record.note}'`;

  if (record.status == RecordStatus.Duplicate) return [DatabaseStatus.Duplicate, message];

  return [DatabaseStatus.Created, message];
}

function processDuplicate(record: TypedRunnerDB): TypedRunnerDB {
  if (record.status == RecordStatus.Duplicate) {
    record.bibId = record.bibId % 1 != 0 ? record.bibId : Number(record.bibId) + 0.2;
  }
  return record;
}

function scrubStringsFromRenderer(record: TypedRunnerDB) {
  // scrub any string values coming from the UI
  if (record.timeIn instanceof String) record.timeIn = null;
  if (record.timeOut instanceof String) record.timeOut = null;
  if (record.timeModified instanceof String) record.timeModified = null;
}

function preserveOrMergeTimes(
  merge: boolean,
  existingRecord: TypedRunnerDB,
  record: TypedRunnerDB
) {
  // preserve the prior and opposite times when from input, don't merge when it is an edit
  if (merge) {
    if (existingRecord.timeIn != null && record.timeIn == null)
      record.timeIn = new Date(existingRecord.timeIn);
    if (existingRecord.timeOut != null && record.timeOut == null)
      record.timeOut = new Date(existingRecord.timeOut);
  }
}

function processNote(record: TypedRunnerDB, sync: dbAthletes.SyncDirection) {
  if (record.status == RecordStatus.Duplicate) {
    setTimingRecordNote(record);
  } else {
    dbAthletes.syncNoteWithAthlete(record.bibId, record.note, record.index, sync);
  }
}

export function setTimingRecordNote(record: TypedRunnerDB) {
  const db = getDatabaseConnection();
  const incomingNote = !record.note ? "" : record.note.replaceAll(",", "").trimStart();

  try {
    db.prepare(`UPDATE StationEvents SET note = ? WHERE "bibId" = ? and "index" = ?`).run(
      incomingNote,
      record.bibId,
      record.index
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `[set][note](timingRecord) bib:${record.bibId} note: ${incomingNote}`;
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
