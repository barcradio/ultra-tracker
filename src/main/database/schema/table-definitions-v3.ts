export const expectedTableNames = {
  Athletes: "Athletes",
  EventLog: "EventLog",
  Output: "Output",
  Stations: "Stations",
  Status: "Status",
  TimeRecords: "TimeRecords",
  RFIDInbox: "RFIDInbox"
};

export const Version = 3;

export { Athletes, EventLog, Output, Stations, Status, TimeRecords } from "./table-definitions-v2";

export const RFIDInbox: string = `
      payload TEXT NOT NULL,
      receivedAt DATETIME NOT NULL,
      processed BOOLEAN DEFAULT (FALSE)`;
