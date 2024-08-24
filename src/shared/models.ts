import { EntryMode } from "./enums";

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

export interface RunnerCSV {
  index: number;
  bibId: number;
  timeIn: string;
  timeOut: string;
  note: string;
  sent: number;
}

export interface Runner {
  id: number;
  sequence: number;
  runner: number;
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
  dns: boolean | undefined;
  dnf: boolean | undefined;
  dnfStation: string | undefined;
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
  dropbags: boolean;
  crewaccess: boolean;
  paceraccess: boolean;
  cutofftime: string;
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
  cutofftime: Date;
  entrymode: EntryMode;
  operators: Operator[];
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
  shiftBegin: Date;
  shiftEnd: Date;
};

export type DNXRecord = {
  stationId: string;
  bibId: number;
  dnsDateTime: string;
  note: string;
};
