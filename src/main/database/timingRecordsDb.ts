import { RecordType, TimingRecord } from "$shared/models";
import { getDatabaseConnection } from "./connect";
import { data } from "../../preload/data";

export function insertOrUpdateTimingRecord(record: TimingRecord) {
  const db = getDatabaseConnection();

  const query = db.prepare(`SELECT * FROM Runners WHERE Bib_id = ?`);
  const result = query.get(record.bib);

  if (!result) {
    return insertTimingRecord(record);
  } else {
    return updateTimingRecord(record);
  }
}

function updateTimingRecord(record: TimingRecord) {
  const db = getDatabaseConnection();
  let queryString = "";

  const stationID = data.station.id;
  const note = record.note;

  switch (record.type) {
    case RecordType.In: {
      const dateISO: string = record.datetime.toISOString();
      queryString = `UPDATE Runners SET station_id = '${stationID}', time_in = '${dateISO}', last_changed = '${dateISO}', note = '${note}' WHERE bib_id = ?`;
      break;
    }
    case RecordType.Out: {
      queryString = `UPDATE Runners SET station_id = '${stationID}', time_out = '${dateISO}', last_changed = '${dateISO}', note ='${note}' WHERE bib_id = ?`;
      break;
    }
    case RecordType.InOut: {
      queryString = `UPDATE Runners SET station_id = '${stationID}', time_in = '${dateISO}', time_out = '${dateISO}', last_changed = '${dateISO}', note ='${note}' WHERE bib_id = ?`;
      break;
    }
  }

  try {
    const query = db.prepare(queryString);
    query.run(record.bib);
    return `timing-record:update ${record.bib}, ${record.datetime}, ${record.type.toString()} ${record.note}`;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return e.message;
    }
    return "";
  }
}

function insertTimingRecord(record: TimingRecord) {
  const db = getDatabaseConnection();

  const stationID = data.station.id;
  const dateISO: string = record.datetime.toISOString();
  const sent: number = 0;
  const note = "";

  try {
    const query = db.prepare(
      `INSERT INTO Runners (bib_id, station_id, time_in, time_out, last_changed, note, sent) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    switch (record.type) {
      case RecordType.In: {
        query.run(record.bib, stationID, dateISO, null, dateISO, note, sent);
        break;
      }
      case RecordType.Out: {
        query.run(record.bib, stationID, null, dateISO, dateISO, note, sent);
        break;
      }
      case RecordType.InOut: {
        query.run(record.bib, stationID, dateISO, dateISO, dateISO, note, sent);
        break;
      }
    }
    return `timing-record:add ${record.bib}, ${record.datetime}, ${record.type.toString()} ${record.note}`;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return e.message;
    }
    return "";
  }
}
