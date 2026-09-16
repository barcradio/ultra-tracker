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
  Watchlist,
  EventMeta
} from "./table-definitions-v3";

// Records the idempotency key of each RFID tag event once its timing record is durably
// written, so a replayed inbox message or pending-write retry cannot insert it twice.
export const RFIDProcessedEvents: string = `
      eventKey TEXT NOT NULL UNIQUE,
      processedAt DATETIME NOT NULL`;
