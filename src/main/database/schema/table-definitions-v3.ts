export const expectedTableNames = {
  Athletes: "Athletes",
  EventLog: "EventLog",
  Output: "Output",
  OpenSplitTimePushStatus: "OpenSplitTimePushStatus",
  Stations: "Stations",
  Status: "Status",
  TimeRecords: "TimeRecords",
  RFIDInbox: "RFIDInbox",
  RFIDPendingWrites: "RFIDPendingWrites"
};

export const Version = 3;

export {
  Athletes,
  EventLog,
  Output,
  OpenSplitTimePushStatus,
  Stations,
  Status,
  TimeRecords
} from "./table-definitions-v2";

export const RFIDInbox: string = `
      payload TEXT NOT NULL,
      receivedAt DATETIME NOT NULL,
      processed BOOLEAN DEFAULT (FALSE)`;

export const RFIDPendingWrites: string = `
  bibId INTEGER NOT NULL,
  tagTimestamp DATETIME NOT NULL,
  receivedAt DATETIME NOT NULL,
  attempts INTEGER NOT NULL DEFAULT (0),
  lastError TEXT,
  processed BOOLEAN DEFAULT (FALSE)`;
