import { OpenSplitTimePushStatus } from "./table-definitions-v2";

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

export const Version = 5;

export {
  Athletes,
  EventLog,
  Output,
  Stations,
  Status,
  TimeRecords,
  RFIDInbox,
  RFIDPendingWrites
} from "./table-definitions-v4";

export { OpenSplitTimePushStatus };
