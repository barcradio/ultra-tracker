import { getDatabaseConnection } from "./connect";
import { data } from "../../preload/data";
import { RunnerDB } from "../../shared/models";

export function insertOrUpdateTimeRecord(record: RunnerDB) {
  const bibResult = getTimeRecordbyBib(record);
  const indexResult = getTimeRecordbyIndex(record);

  // new record
  if (!bibResult && !indexResult) {
    return insertTimeRecord(record);
  }

  //both exist and are equal, just updating normally
  if (bibResult && indexResult && bibResult == indexResult) {
    updateTimeRecord(record, indexResult);
  }

  // only record with index exists, probably updating bib number on correct record
  if (!bibResult && indexResult) {
    return updateTimeRecord(record, indexResult);
  }

  // only record with bib exists, could be duplicate
  if (bibResult && !indexResult) {
    return updateTimeRecord(record, bibResult);
  }

  // both exist but not equal?! definitely creating a duplicate, should be solved in error checking
  //if (bibResult && indexResult && bibResult != indexResult)
}

export function getTimeRecordbyBib(record: RunnerDB): RunnerDB | null {
  const db = getDatabaseConnection();
  let queryString = "";
  let queryResult: RunnerDB | null = null;

  queryString = `SELECT * FROM Runners WHERE bibId = ?`;
  try {
    const query = db.prepare(queryString);
    queryResult = query.get(record.bibId);

    if (queryResult == null) return null;

    if (queryResult.bibId == record.bibId) {
      console.log(`timing-record:Found timeRecord with bib: ${queryResult.bibId}`);
      return queryResult;
    }
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
  }
  return queryResult;
}

export function getTimeRecordbyIndex(record: RunnerDB): RunnerDB | null {
  const db = getDatabaseConnection();
  let queryString = "";
  let queryResult: RunnerDB | null = null;

  queryString = `SELECT * FROM Runners WHERE "index" = ?`;
  try {
    const query = db.prepare(queryString);
    queryResult = query.get(record.index);

    if (queryResult == null) return null;

    console.log(`timing-record:Found timeRecord with index: ${queryResult.index}`);
    return queryResult;
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
  }
  return queryResult;
}

export function deleteTimeRecord(record: RunnerDB) {
  const db = getDatabaseConnection();
  let queryString = "";

  const searchResult = getTimeRecordbyIndex(record);

  if (searchResult != null) {
    queryString = `DELETE FROM Runners WHERE "index" = ?`;
    try {
      const query = db.prepare(queryString);
      query.run(record.index);
      return `timing-record:delete ${record.index}`;
    } catch (e) {
      if (e instanceof Error) {
        console.error(e.message);
        return e.message;
      }
      return "";
    }
  } else {
    return `timing-record:delete Bib ${record.bibId} not found`;
  }
}

function updateTimeRecord(record: RunnerDB, existingRecord: RunnerDB) {
  const db = getDatabaseConnection();
  let queryString = "";

  // scrub any string values coming from the UI
  if (record.timeIn instanceof String) record.timeIn = null;
  if (record.timeOut instanceof String) record.timeOut = null;
  if (record.timeModified instanceof String) record.timeModified = null;

  if (existingRecord.timeIn != null && record.timeIn == null) record.timeIn = new Date(existingRecord.timeIn);
  if (existingRecord.timeOut != null && record.timeOut == null) record.timeOut = new Date(existingRecord.timeOut);

  //build the time record
  const stationID = data.station.id;
  const timeInISO: string | null = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO: string | null = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO: string | null = record.timeModified == null ? null : record.timeModified.toISOString();
  const sent: number = Number(record.sent);
  const note = record.note;

  try {
    // if bib number is changing, then update by index
    if (existingRecord != null && existingRecord.bibId != record.bibId) {
      queryString = `UPDATE Runners SET bibId = ?, stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, note = ?, sent = ? WHERE "index" = ?`;
      const query = db.prepare(queryString);
      query.run(record.bibId, stationID, timeInISO, timeOutISO, modifiedISO, note, sent, record.index);
    } else {
      queryString = `UPDATE Runners SET stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, note = ?, sent = ? WHERE bibId = ?`;
      const query = db.prepare(queryString);
      query.run(stationID, timeInISO, timeOutISO, modifiedISO, note, sent, record.bibId);
    }

    return `timing-record:update ${record.bibId}, ${timeInISO}, ${timeOutISO}, ${modifiedISO}, '${record.note}'`;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return e.message;
    }
    return "";
  }
}

function insertTimeRecord(record: RunnerDB) {
  const db = getDatabaseConnection();

  const stationID = data.station.id;
  const timeInISO: string | null = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO: string | null = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO: string | null = record.timeModified == null ? null : record.timeModified.toISOString();
  const sent: number = Number(record.sent);
  const note = record.note;

  try {
    const query = db.prepare(
      `INSERT INTO Runners (bibId, stationId, timeIn, timeOut, timeModified, note, sent) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    query.run(record.bibId, stationID, timeInISO, timeOutISO, modifiedISO, note, sent);

    return `timing-record:add ${record.bibId}, ${timeInISO}, ${timeOutISO}, ${modifiedISO}, '${record.note}'`;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return e.message;
    }
    return "";
  }
}
