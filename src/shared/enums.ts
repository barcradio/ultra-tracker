export enum DatabaseStatus {
  Created,
  Updated,
  Deleted,
  Duplicate,
  NotFound,
  Error,
  Success
}

export enum EntryMode {
  Normal,
  Fast,
  InOnly,
  OutOnly
}

export enum RecordType {
  In,
  Out,
  InOut
}

export enum RecordStatus {
  OK,
  Duplicate
}
