import { DatabaseStatus } from "$shared/enums";
import { RfidTagRead } from "$shared/types";
import { LogLevel, logRFID } from "./rfid-log";
import * as dbRFIDPendingWrites from "../../database/rfidPendingWrites-db";
import * as dbTimings from "../../database/timingRecords-db";

export class RfidTimingWriter {
  private writeQueue: RfidTagRead[] = [];
  private isWriting = false;
  private pendingWriteRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingWriteRetryAttempt = 0;
  private readonly maxWriteRetries = 3;
  private readonly initialPendingWriteRetryDelay = 1000;
  private readonly maxPendingWriteRetryDelay = 30000;

  public recoverPendingWrites(): void {
    this.processPendingWrites();
  }

  public write(tagRead: RfidTagRead): void {
    this.writeQueue.push(tagRead);
    this.processWriteQueue();
  }

  private processWriteQueue(): void {
    if (this.isWriting || this.writeQueue.length === 0) return;

    const tagRead = this.writeQueue.shift();
    if (!tagRead) return;

    this.isWriting = true;
    this.writeTagToDatabase(tagRead, 0);
  }

  private writeTagToDatabase(tagRead: RfidTagRead, attempt: number): void {
    try {
      this.writeTimeRecord(tagRead);
      this.isWriting = false;
      this.processWriteQueue();
    } catch (error) {
      if (attempt < this.maxWriteRetries) {
        logRFID(
          LogLevel.warn,
          `RFID database write failed, retrying (${attempt + 1}/${this.maxWriteRetries}):`,
          error
        );
        setTimeout(() => this.writeTagToDatabase(tagRead, attempt + 1), 100);
        return;
      }

      logRFID(LogLevel.error, "RFID database write failed after retries, queuing durably:", error);
      dbRFIDPendingWrites.enqueue(tagRead.bibId, tagRead.timestamp.toISOString());
      this.isWriting = false;
      this.processWriteQueue();
      this.schedulePendingWriteRetry();
    }
  }

  private processPendingWrites(): void {
    const pending = dbRFIDPendingWrites.getPending();
    if (pending.length === 0) {
      this.resetPendingWriteRetry();
      return;
    }

    let allSucceeded = true;
    for (const record of pending) {
      try {
        this.writeTimeRecord({ bibId: record.bibId, timestamp: new Date(record.tagTimestamp) });
        dbRFIDPendingWrites.markProcessed(record.index);
      } catch (error) {
        allSucceeded = false;
        const message = error instanceof Error ? error.message : String(error);
        dbRFIDPendingWrites.recordAttemptFailure(record.index, message);
      }
    }

    if (allSucceeded) this.resetPendingWriteRetry();
    else this.schedulePendingWriteRetry();
  }

  private writeTimeRecord(tagRead: RfidTagRead): void {
    const [status, message] = dbTimings.insertOrUpdateTimeRecord({
      index: -1,
      bibId: tagRead.bibId,
      stationId: -1,
      timeIn: tagRead.timestamp,
      timeOut: tagRead.timestamp,
      timeModified: tagRead.timestamp,
      note: "RFID",
      sent: false,
      status: -1
    });

    if (status === DatabaseStatus.Error) {
      throw new Error(message || "Unknown database error writing RFID timing record");
    }
  }

  private schedulePendingWriteRetry(): void {
    if (this.pendingWriteRetryTimer) return;

    const delay = Math.min(
      this.initialPendingWriteRetryDelay * 2 ** this.pendingWriteRetryAttempt,
      this.maxPendingWriteRetryDelay
    );
    this.pendingWriteRetryAttempt++;
    logRFID(LogLevel.warn, `Retrying pending RFID database writes in ${delay}ms`);
    this.pendingWriteRetryTimer = setTimeout(() => {
      this.pendingWriteRetryTimer = null;
      this.processPendingWrites();
    }, delay);
  }

  private resetPendingWriteRetry(): void {
    if (this.pendingWriteRetryTimer) {
      clearTimeout(this.pendingWriteRetryTimer);
      this.pendingWriteRetryTimer = null;
    }
    this.pendingWriteRetryAttempt = 0;
  }
}
