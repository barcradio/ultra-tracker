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
}

export type Runner = {
  index: number;
  bib: number;
  firstname: string;
  lastname: string;
  gender: string;
  age: number;
  city: string;
  state: string;
  emPhone: string;
  emName: string;
  dns: boolean | undefined;
  dnf: boolean | undefined;
  dnfStation: number | undefined;
  dnfDateTime: Date | null;
};

export type TimingRecord = {
  bib: number;
  datetime: Date;
  type: RecordType;
  note: string;
};

export enum RecordType {
  In,
  Out,
  InOut
}

export type StationDB = {
  name: string;
  identifier: string;
  description: string;
  location: string;
  distance: number;
  split: boolean;
  operators: string;
};

export type Station = {
  name: string;
  identifier: string;
  description: string;
  location: Location;
  distance: number;
  split: boolean;
  operators: Operator[];
};

export type Location = {
  latitude: number;
  longitude: number;
};

export type Operator = {
  fullname: string;
  callsign: string;
  phone: number;
  shiftBegin: Date;
  shiftEnd: Date;
};

// Status enums
export enum DatabaseStatus {
  Created,
  Updated,
  Deleted,
  Duplicate,
  NotFound,
  Error,
  Success
}
