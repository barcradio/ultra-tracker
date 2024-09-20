export enum DatabaseStatus {
  Created,
  Updated,
  Deleted,
  Duplicate,
  NotFound,
  Error,
  Success
}

export enum DNFType {
  None = "none",
  Withdrew = "withdrew",
  Timeout = "timeout",
  Medical = "medical",
  Unknown = "unknown"
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

export enum RFIDReaderStatus {
  Connected,
  Connecting,
  NoDevice,
  Disconnected,
  Error
}
