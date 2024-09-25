import { DatabaseStatus } from "./enums";

export type DatabaseResponse<T = undefined> = T extends undefined
  ? [DatabaseStatus, string]
  : [T | null, DatabaseStatus, string];

export interface SetStationIdentityParams {
  callsign: string;
  identifier: string;
}

export interface Toast {
  message: string;
  type: "info" | "success" | "danger" | "warning";
  timeoutMs?: number;
  noIcon?: boolean;
}
