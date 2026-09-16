export const expectedTableNames = {
  Athletes: "Athletes",
  EventLog: "EventLog",
  Output: "Output",
  OpenSplitTimePushStatus: "OpenSplitTimePushStatus",
  Stations: "Stations",
  Status: "Status",
  TimeRecords: "TimeRecords",
  RFIDInbox: "RFIDInbox",
  RFIDPendingWrites: "RFIDPendingWrites",
  RFIDProcessedEvents: "RFIDProcessedEvents",
  Watchlist: "Watchlist",
  EventMeta: "EventMeta"
};

export const Version = 4;

export {
  Athletes,
  EventLog,
  Output,
  Stations,
  TimeRecords,
  OpenSplitTimePushStatus,
  Status,
  RFIDInbox,
  RFIDPendingWrites,
  Watchlist
} from "./table-definitions-v3";

// Records the idempotency key of each RFID tag event once its timing record is durably
// written, so a replayed inbox message or pending-write retry cannot insert it twice.
export const RFIDProcessedEvents: string = `
      eventKey TEXT NOT NULL UNIQUE,
      processedAt DATETIME NOT NULL`;

// openSplitTime holds the JSON-serialized event.openSplitTime metadata (production/staging/splitNames)
// so it travels with the event database instead of only living in the global app config.
export const EventMeta = `
      name TEXT,
      startline TEXT,
      finishline TEXT,
      starttime DATETIME,
      endtime DATETIME,
      openSplitTime TEXT`;
