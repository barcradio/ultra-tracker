export const expectedTableNames = {
  Athletes: "Athletes",
  EventLog: "EventLog",
  Output: "Output",
  Stations: "Stations",
  Status: "Status",
  TimeRecords: "TimeRecords",
  RFIDInbox: "RFIDInbox",
  RFIDPendingWrites: "RFIDPendingWrites"
};

export const Version = 4;

export {
  Athletes,
  EventLog,
  Output,
  Stations,
  Status,
  TimeRecords,
  RFIDInbox
} from "./table-definitions-v3";

export const RFIDPendingWrites: string = `
      bibId INTEGER NOT NULL,
      tagTimestamp DATETIME NOT NULL,
      receivedAt DATETIME NOT NULL,
      attempts INTEGER NOT NULL DEFAULT (0),
      lastError TEXT,
      processed BOOLEAN DEFAULT (FALSE)`;
