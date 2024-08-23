import { getDatabaseConnection } from "./connect-db";
import { data } from "../../preload/data";
import { DatabaseStatus, RunnerDB } from "../../shared/models";

export function insertOrUpdateTimeRecord(record: RunnerDB): [DatabaseStatus, string] {
  let status: DatabaseStatus = DatabaseStatus.Error;
  let message: string = "";

  const bibResult = getTimeRecordbyBib(record)[0];
  const indexResult = getTimeRecordbyIndex(record)[0];

  // new record
  if (!bibResult && !indexResult) [status, message] = insertTimeRecord(record);

  // only record with index exists, probably updating bib number on correct record
  if (!bibResult && indexResult) [status, message] = updateTimeRecord(record, indexResult);

  // only record with bib exists, could be duplicate
  if (bibResult && !indexResult) [status, message] = updateTimeRecord(record, bibResult);

  //both queries succeed exist and are equal, but the incoming object is not, we are just updating normally
  if (bibResult && indexResult && JSON.stringify(bibResult) === JSON.stringify(indexResult)) {
    if (JSON.stringify(record) !== JSON.stringify(indexResult)) {
      [status, message] = updateTimeRecord(record, indexResult);
    }
  }
  console.log(message);
  return [status, message];
}

export function getTimeRecordbyBib(record: RunnerDB): [RunnerDB | null, DatabaseStatus, string] {
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

export function getTimeRecordbyIndex(record: RunnerDB): [RunnerDB | null, DatabaseStatus, string] {
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

export function deleteTimeRecord(record: RunnerDB): [DatabaseStatus, string] {
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

function updateTimeRecord(record: RunnerDB, existingRecord: RunnerDB): [DatabaseStatus, string] {
  const db = getDatabaseConnection();
  let queryString = "";

  // scrub any string values coming from the UI
  if (record.timeIn instanceof String) record.timeIn = null;
  if (record.timeOut instanceof String) record.timeOut = null;
  if (record.timeModified instanceof String) record.timeModified = null;

  //build the time record
  const stationID = data.station.id;
  const timeInISO = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO = record.timeModified == null ? null : record.timeModified.toISOString();
  const sent = Number(record.sent);
  const note = record.note;

  try {
    // if bib number is changing, then update by index
    if (existingRecord != null && existingRecord.bibId != record.bibId) {
      queryString = `UPDATE StaEvents SET bibId = ?, stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, note = ?, sent = ? WHERE "index" = ?`;
      const query = db.prepare(queryString);
      query.run(
        record.bibId,
        stationID,
        timeInISO,
        timeOutISO,
        modifiedISO,
        note,
        sent,
        record.index
      );
    } else {
      queryString = `UPDATE StaEvents SET stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, note = ?, sent = ? WHERE bibId = ?`;
      const query = db.prepare(queryString);
      query.run(stationID, timeInISO, timeOutISO, modifiedISO, note, sent, record.bibId);
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

function insertTimeRecord(record: RunnerDB): [DatabaseStatus, string] {
  const db = getDatabaseConnection();

  const stationID = data.station.id;
  const timeInISO = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO = record.timeModified == null ? null : record.timeModified.toISOString();
  const sent = Number(record.sent);
  const note = record.note;

  try {
    const query = db.prepare(
      `INSERT INTO StaEvents (bibId, stationId, timeIn, timeOut, timeModified, note, sent) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    query.run(record.bibId, stationID, timeInISO, timeOutISO, modifiedISO, note, sent);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `timing-record:add ${record.bibId}, ${timeInISO}, ${timeOutISO}, ${modifiedISO}, '${record.note}'`;
  return [DatabaseStatus.Created, message];
}
