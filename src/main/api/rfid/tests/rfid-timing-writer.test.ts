import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseStatus } from "../../../../shared/enums";
import { RfidTimingWriter } from "../rfid-timing-writer";

const dbTimings = vi.hoisted(() => ({ insertOrUpdateTimeRecord: vi.fn() }));
vi.mock("../../../database/timingRecords-db", () => dbTimings);

interface PendingWrite {
  index: number;
  bibId: number;
  tagTimestamp: string;
}

const dbPending = vi.hoisted(() => ({
  enqueue: vi.fn(),
  getPending: vi.fn((): PendingWrite[] => []),
  markProcessed: vi.fn(),
  recordAttemptFailure: vi.fn()
}));
vi.mock("../../../database/rfidPendingWrites-db", () => dbPending);

vi.mock("../rfid-log", () => ({
  logRFID: vi.fn(),
  LogLevel: { error: 0, warn: 1, info: 2 }
}));

const TAG_TIME = new Date("2026-09-01T08:00:00Z");

function tagRead(bibId = 101, timestamp = TAG_TIME) {
  return { bibId, timestamp };
}

describe("rfid-timing-writer", () => {
  let writer: RfidTimingWriter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    dbTimings.insertOrUpdateTimeRecord.mockReturnValue([DatabaseStatus.Created, "created"]);
    dbPending.getPending.mockReturnValue([]);
    writer = new RfidTimingWriter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("write", () => {
    it("writes the tag as a timing record marked RFID", () => {
      writer.write(tagRead());

      expect(dbTimings.insertOrUpdateTimeRecord).toHaveBeenCalledWith(
        expect.objectContaining({ bibId: 101, note: "RFID", timeIn: TAG_TIME, timeOut: TAG_TIME })
      );
    });

    it("writes every queued tag", () => {
      writer.write(tagRead(101));
      writer.write(tagRead(102));

      expect(dbTimings.insertOrUpdateTimeRecord).toHaveBeenCalledTimes(2);
    });

    it("retries a failed write before giving up", async () => {
      dbTimings.insertOrUpdateTimeRecord
        .mockReturnValueOnce([DatabaseStatus.Error, "database locked"])
        .mockReturnValue([DatabaseStatus.Created, "created"]);

      writer.write(tagRead());
      await vi.advanceTimersByTimeAsync(100);

      expect(dbTimings.insertOrUpdateTimeRecord).toHaveBeenCalledTimes(2);
      expect(dbPending.enqueue).not.toHaveBeenCalled();
    });

    it("queues the read durably once the retries are exhausted", async () => {
      dbTimings.insertOrUpdateTimeRecord.mockReturnValue([DatabaseStatus.Error, "database locked"]);

      writer.write(tagRead());
      await vi.advanceTimersByTimeAsync(500);

      expect(dbPending.enqueue).toHaveBeenCalledWith(101, TAG_TIME.toISOString());
    });

    it("never loses a tag read when the database is down", async () => {
      dbTimings.insertOrUpdateTimeRecord.mockReturnValue([DatabaseStatus.Error, "database locked"]);

      writer.write(tagRead(101));
      await vi.advanceTimersByTimeAsync(500);
      writer.write(tagRead(102));
      await vi.advanceTimersByTimeAsync(500);

      expect(dbPending.enqueue).toHaveBeenCalledWith(101, expect.any(String));
      expect(dbPending.enqueue).toHaveBeenCalledWith(102, expect.any(String));
    });
  });

  describe("recoverPendingWrites", () => {
    it("does nothing when there is nothing queued", () => {
      writer.recoverPendingWrites();

      expect(dbTimings.insertOrUpdateTimeRecord).not.toHaveBeenCalled();
    });

    it("replays a queued read and marks it processed", () => {
      dbPending.getPending.mockReturnValue([
        { index: 1, bibId: 101, tagTimestamp: TAG_TIME.toISOString() }
      ]);

      writer.recoverPendingWrites();

      expect(dbTimings.insertOrUpdateTimeRecord).toHaveBeenCalledWith(
        expect.objectContaining({ bibId: 101 })
      );
      expect(dbPending.markProcessed).toHaveBeenCalledWith(1);
    });

    it("records the failure and keeps the read queued when the replay fails", () => {
      dbPending.getPending.mockReturnValue([
        { index: 1, bibId: 101, tagTimestamp: TAG_TIME.toISOString() }
      ]);
      dbTimings.insertOrUpdateTimeRecord.mockReturnValue([DatabaseStatus.Error, "still locked"]);

      writer.recoverPendingWrites();

      expect(dbPending.recordAttemptFailure).toHaveBeenCalledWith(1, "still locked");
      expect(dbPending.markProcessed).not.toHaveBeenCalled();
    });

    it("retries the queue on a backoff until it drains", async () => {
      dbPending.getPending.mockReturnValue([
        { index: 1, bibId: 101, tagTimestamp: TAG_TIME.toISOString() }
      ]);
      dbTimings.insertOrUpdateTimeRecord.mockReturnValue([DatabaseStatus.Error, "still locked"]);

      writer.recoverPendingWrites();
      const callsAfterFirstAttempt = dbTimings.insertOrUpdateTimeRecord.mock.calls.length;
      await vi.advanceTimersByTimeAsync(1000);

      expect(dbTimings.insertOrUpdateTimeRecord.mock.calls.length).toBeGreaterThan(
        callsAfterFirstAttempt
      );
    });

    it("stops retrying once every queued read is written", async () => {
      dbPending.getPending.mockReturnValue([
        { index: 1, bibId: 101, tagTimestamp: TAG_TIME.toISOString() }
      ]);
      dbTimings.insertOrUpdateTimeRecord.mockReturnValue([DatabaseStatus.Error, "still locked"]);
      writer.recoverPendingWrites();

      dbTimings.insertOrUpdateTimeRecord.mockReturnValue([DatabaseStatus.Created, "created"]);
      await vi.advanceTimersByTimeAsync(1000);
      dbPending.getPending.mockReturnValue([]);
      const callsAfterDrain = dbTimings.insertOrUpdateTimeRecord.mock.calls.length;
      await vi.advanceTimersByTimeAsync(60_000);

      expect(dbTimings.insertOrUpdateTimeRecord.mock.calls.length).toBe(callsAfterDrain);
    });
  });
});
