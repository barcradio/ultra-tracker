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
  Watchlist: "Watchlist"
};

export const Version = 5;

export {
  Athletes,
  EventLog,
  Output,
  OpenSplitTimePushStatus,
  Stations,
  Status,
  TimeRecords,
  RFIDInbox,
  RFIDPendingWrites
} from "./table-definitions-v4";

export const Watchlist = `
      bibId INTEGER NOT NULL UNIQUE`;