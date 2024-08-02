/**
 * Custom models (types) for ultra-tracker
 */
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
  dnfDateTime: Date | undefined;
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

export type Station = {
  name: string;
  operators: Operator[];
};

export type Operator = {
  fullname: string;
  callsign: string;
  phone: number;
};
