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

export const Version = 3;

export {
  Athletes,
  EventLog,
  Output,
  Stations,
  TimeRecords,
  OpenSplitTimePushStatus
} from "./table-definitions-v2";

export const Status: string = `
      bibId INTEGER DEFAULT (0), -- TODO: Index,
      dropped INTEGER, -- TODO: Index
      dropReason TEXT,
      dropStation TEXT, -- TODO: Index
      dropDateTime DATETIME,
      note TEXT,
      progress INTEGER`;

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

export const Watchlist = `
      bibId INTEGER NOT NULL UNIQUE`;

export const EventMeta = `
      name TEXT,
      startline TEXT,
      finishline TEXT,
      starttime DATETIME,
      endtime DATETIME`;
