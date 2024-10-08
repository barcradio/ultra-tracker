import { AthleteStatus, DNFType, EntryMode, RecordType } from "./enums";

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
}

export interface RunnerCSV {
  index: number;
  bibId: number;
  timeIn: string;
  timeOut: string;
  note: string;
  sent: number;
  dnfType: string;
  dnfStation: string;
  dnfDateTime: string;
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
  dns: boolean | undefined;
  dnf: boolean | undefined;
  dnfType: DNFType | undefined;
  dnfStation: string | undefined;
  dnfDateTime: Date | null;
  note: string | undefined;
  status: AthleteStatus | undefined;
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

export type DNSRecord = {
  stationId: string;
  bibId: number;
  dnsDateTime: string;
  note: string;
};

export type DNFRecord = {
  stationId: string;
  bibId: number;
  dnfType: string;
  dnfDateTime: string;
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

export type RunnerAthleteDB = RunnerDB & Pick<AthleteDB, "dnf" | "dnfType" | "dns">;
