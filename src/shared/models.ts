import { AthleteProgress, DeviceStatus, DropReason, EntryMode, RecordType } from "./enums";

/**
 * Custom models (types) for ultra-tracker
 */
export interface RunnerDB {
  index: number;
  bibId: number;
  stationId: number;
  timeIn: Date | null;
  timeOut: Date | null;
  timeModified: Date | null;
  note: string;
  sent: boolean;
  status: number;
  openSplitTimePushStatus?: "success" | "error";
  openSplitTimePushError?: string;
}

export interface RunnerCSV {
  index: number;
  bibId: number;
  timeIn: string;
  timeOut: string;
  note: string;
  sent: number;
  dropReason: string;
  dropStation: string;
  dropDateTime: string;
}

export interface Runner {
  id: number;
  sequence: number;
  bibId: number;
  in: Date | string;
  out: Date | string;
  note: string;
}

export type AthleteDB = {
  index: number;
  bibId: number;
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  city: string;
  state: string;
  emergencyPhone: number;
  emergencyName: string;
};

export type StatusDB = {
  bibId: number;
  dropped: boolean | undefined;
  dropReason: DropReason | undefined;
  dropStation: string | undefined;
  dropDateTime: Date | null;
  note: string | undefined;
  progress: AthleteProgress | undefined;
};

export type TimingRecord = {
  bib: number;
  datetime: Date;
  type: RecordType;
  note: string;
};

export type StationDB = {
  name: string;
  identifier: string;
  description: string;
  location: string;
  distance: number;
  dropbags: boolean;
  crewaccess: boolean;
  paceraccess: boolean;
  shiftBegin: string;
  cutofftime: string;
  shiftEnd: string;
  entrymode: number;
  operators: string;
};

export type Station = {
  name: string;
  identifier: string;
  description: string;
  location: Location;
  distance: number;
  dropbags: boolean;
  crewaccess: boolean;
  paceraccess: boolean;
  shiftBegin: Date;
  cutofftime: Date;
  shiftEnd: Date;
  entrymode: EntryMode;
  operators: Record<string, Operator>;
};

export type Location = {
  latitude: number;
  longitude: number;
  elevation: number;
};

export type Operator = {
  fullname: string;
  callsign: string;
  phone: number;
  active: boolean;
};

export type DropRecord = {
  stationId: string;
  bibId: number;
  dropReason: string;
  dropDateTime: string;
  note: string;
};

export type EventLogRec = {
  index: number;
  bibId: number;
  stationId: number;
  timeIn: Date | null;
  timeOut: Date | null;
  timeModified: Date | null;
  comments: string;
  sent: boolean | undefined;
  verbose: boolean | undefined;
};

export type RunnerAthleteDB = RunnerDB & Pick<StatusDB, "dropped" | "dropReason">;

export type AthleteStatusDB = AthleteDB &
  Pick<StatusDB, "dropped" | "dropReason" | "note" | "progress">;

export type RfidSettings = {
  type: string;
  restApiUrl: string;
  webSocketUrl: string;
  userName: string;
  password: string;
  websocketPort: string | number;
  secureWebsocket: boolean;
  // Pinned cert serial number or CN for the reader's self-signed cert
  sslCert: string;
  status: DeviceStatus;
};

export type RfidConnectionSettings = Pick<
  RfidSettings,
  "type" | "restApiUrl" | "webSocketUrl" | "userName" | "password" | "sslCert"
>;
