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

// openSplitTime holds the JSON-serialized event.openSplitTime metadata (production/staging/splitNames)
// so it travels with the event database instead of only living in the global app config.
export const EventMeta = `
      name TEXT,
      startline TEXT,
      finishline TEXT,
      starttime DATETIME,
      endtime DATETIME,
      openSplitTime TEXT`;
