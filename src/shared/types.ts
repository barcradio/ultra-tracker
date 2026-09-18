import { DatabaseStatus } from "./enums";
import { Station } from "./models";

export type DatabaseResponse<T = undefined> = T extends undefined
  ? [DatabaseStatus, string]
  : [T | null, DatabaseStatus, string];

export interface SetStationIdentityParams {
  callsign: string;
  identifier: string;
  /** Set once the operator has agreed to move the timing records already logged here. */
  moveTimingRecords?: boolean;
}

export interface EventArchivePreview {
  archiveFilePath: string;
  eventName: string;
  stations: Station[];
}

export type DropsImportConflictAction = "preserve-existing" | "use-imported";

export type DropsImportRecommendationConfidence = "low" | "medium" | "high";

export interface DropsImportStatusValue {
  dropReason: string | null;
  dropStation: string | null;
  dropDateTime: string | null;
}

export interface DropsImportConflict {
  id: string;
  bibId: number;
  existing: DropsImportStatusValue;
  imported: DropsImportStatusValue;
  importedNote: string;
  recommendedAction: DropsImportConflictAction;
  recommendationReason: string;
  recommendationConfidence: DropsImportRecommendationConfidence;
}

export interface DropsImportPreviewRecord {
  bibId: number;
  reason: string;
  status: string | null;
  station: string | null;
  dateTime: string | null;
  note: string | null;
}

export interface DropsImportPreview {
  importId: string;
  sourceLabel: string;
  totalRowCount: number;
  processedCount: number;
  invalidRowCount: number;
  importableCount: number;
  skippedFutureStationCount: number;
  duplicateCount: number;
  readyRecords: DropsImportPreviewRecord[];
  skippedRecords: DropsImportPreviewRecord[];
  duplicateRecords: DropsImportPreviewRecord[];
  conflicts: DropsImportConflict[];
}

export interface DropsImportDecision {
  conflictId: string;
  action: DropsImportConflictAction;
}

export interface ApplyDropsImportParams {
  importId: string;
  decisions: DropsImportDecision[];
}

export interface DropsImportReport {
  sourceLabel: string;
  totalRowCount: number;
  processedCount: number;
  invalidRowCount: number;
  importedCount: number;
  preservedCount: number;
  skippedFutureStationCount: number;
  duplicateCount: number;
  conflictCount: number;
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
