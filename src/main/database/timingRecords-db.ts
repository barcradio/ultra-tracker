import { getDatabaseConnection } from "./connect";
import { data } from "../../preload/data";
import { RunnerDB } from "../../shared/models";

export function insertOrUpdateTimeRecord(record: RunnerDB) {
  const db = getDatabaseConnection();

  const query = db.prepare(`SELECT * FROM Runners WHERE bibId = ?`);
  const result = query.get(record.bibId);

  if (!result) {
    return insertTimeRecord(record);
  } else {
    return updateTimeRecord(record);
  }
}

function updateTimeRecord(record: RunnerDB) {
  const db = getDatabaseConnection();
  let queryString = "";

  if (record.timeIn instanceof String) record.timeIn = null;
  if (record.timeOut instanceof String) record.timeOut = null;
  if (record.timeModified instanceof String) record.timeModified = null;

  const stationID = data.station.id;
  const timeInISO: string | null = record.timeIn == null ? null : record.timeIn.toISOString();
  const timeOutISO: string | null = record.timeOut == null ? null : record.timeOut.toISOString();
  const modifiedISO: string | null = record.timeModified == null ? null : record.timeModified.toISOString();
  const sent: number = Number(record.sent);
  const note = record.note;

  queryString = `UPDATE Runners SET stationId = ?, timeIn = ?, timeOut = ?, timeModified = ?, note = ?, sent = ? WHERE bibId = ?`;

  try {
    const query = db.prepare(queryString);
    query.run(stationID, timeInISO, timeOutISO, modifiedISO, note, sent, record.bibId);
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
