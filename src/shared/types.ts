import { DatabaseStatus } from "./enums";
import { Station } from "./models";

export type DatabaseResponse<T = undefined> = T extends undefined
  ? [DatabaseStatus, string]
  : [T | null, DatabaseStatus, string];

export interface SetStationIdentityParams {
  callsign: string;
  identifier: string;
}

export interface EventArchivePreview {
  archiveFilePath: string;
  eventName: string;
  stations: Station[];
}

export interface Toast {
  message: string;
  type: "info" | "success" | "danger" | "warning";
  timeoutMs?: number;
  noIcon?: boolean;
  action?: {
    type: "remove-watchlist";
    bibId: number;
  };
}

export interface RfidTagRead {
  bibId: number;
  timestamp: Date;
}
