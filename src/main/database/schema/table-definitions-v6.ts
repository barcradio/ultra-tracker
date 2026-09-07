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
  Watchlist: "Watchlist",
  EventMeta: "EventMeta"
};

export const Version = 6;

export {
  Athletes,
  EventLog,
  Output,
  OpenSplitTimePushStatus,
  Stations,
  Status,
  TimeRecords,
  RFIDInbox,
  RFIDPendingWrites,
  Watchlist
} from "./table-definitions-v5";

export const EventMeta = `
      name TEXT,
      startline TEXT,
      finishline TEXT,
      starttime DATETIME,
      endtime DATETIME`;
