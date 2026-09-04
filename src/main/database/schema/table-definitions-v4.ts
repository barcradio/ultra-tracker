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

export const Version = 4;

export {
  Athletes,
  EventLog,
  Output,
  OpenSplitTimePushStatus,
  Stations,
  TimeRecords,
  RFIDInbox,
  RFIDPendingWrites
} from "./table-definitions-v3";

/*  The Status table is used to store the status of an athlete independent of other table operations.
    "dns"/"dnf"/"dnfType" are unified here into a single "dropped"/"dropReason" pair, where
    DidNotStart is just another drop reason. */
export const Status: string = `
      bibId INTEGER DEFAULT (0), -- TODO: Index,
      dropped INTEGER, -- TODO: Index
      dropReason TEXT,
      dropStation TEXT, -- TODO: Index
      dropDateTime DATETIME,
      note TEXT,
      progress INTEGER`;
