import appSettings from "electron-settings";
import { DatabaseResponse } from "$shared/types";
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

  queryString = `SELECT * FROM StaEvents WHERE bibId = ?`;
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

  queryString = `SELECT * FROM StaEvents WHERE "index" = ?`;
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
    queryString = `DELETE FROM StaEvents WHERE "index" = ?`;
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
  isDuplicate(record);
  const stationID = stationId;
  const timeInISO = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO = record.timeModified == null ? null : record.timeModified.toISOString();
  const note = record.note.replaceAll(",", "");
  const sent = Number(record.sent);
  const status = Number(record.status);
  const verbose = false;

  try {
    // if bib number is changing, then update by index
    if (existingRecord != null && existingRecord.bibId != record.bibId) {
      queryString = `UPDATE StaEvents SET bibId = ?, stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, note = ?, sent = ?, status = ? WHERE "index" = ?`;
      const query = db.prepare(queryString);
      query.run(
        record.bibId,
        stationID,
        timeInISO,
        timeOutISO,
        modifiedISO,
        note,
        sent,
        status,
        record.index
      );

      logEvent(
        record.bibId,
        String(record.stationId), //better to use identifier
        timeInISO == null ? "" : timeInISO,
        timeOutISO == null ? "" : timeOutISO,
        modifiedISO == null ? "" : modifiedISO,
        "Update Timing record",
        record.sent,
        verbose
      );
    } else {
      queryString = `UPDATE StaEvents SET stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, note = ?, sent = ?, status = ? WHERE bibId = ?`;
      const query = db.prepare(queryString);
      query.run(stationID, timeInISO, timeOutISO, modifiedISO, note, sent, status, record.bibId);
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

  //build the time record
  isDuplicate(record);
  const stationID = stationId;
  const timeInISO = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO = record.timeModified == null ? null : record.timeModified.toISOString();
  const note = record.note.replaceAll(",", "");
  const sent = Number(record.sent);
  const status = Number(record.status);
  const verbose = false;

  try {
    const query = db.prepare(
      `INSERT INTO StaEvents (bibId, stationId, timeIn, timeOut, timeModified, note, sent, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    query.run(record.bibId, stationID, timeInISO, timeOutISO, modifiedISO, note, sent, status);

    logEvent(
      record.bibId,
      String(record.stationId), //better to use identifier
      timeInISO == null ? "" : timeInISO,
      timeOutISO == null ? "" : timeOutISO,
      modifiedISO == null ? "" : modifiedISO,
      "Update time record",
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

export function markTimeRecordAsSent(bibId: number) {
  const db = getDatabaseConnection();

  try {
    db.prepare(`UPDATE StaEvents SET sent = ? WHERE "bibId" = ?`).run(Number(true), bibId);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `timing-record:sent ${bibId}`;
  return [DatabaseStatus.Created, message];
}

function isDuplicate(record: TypedRunnerDB): TypedRunnerDB {
  if (record.status == RecordStatus.Duplicate) {
    record.bibId = Number(record.bibId) + 0.2;
    const typeStr = RecordType[record.recordType];
    record.note = `[Duplicate:${typeStr}] ` + record.note;
  }
  return record;
}
