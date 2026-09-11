import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RfidSettings } from "../../../../shared/models";
import { ZebraWebSocketProcessor } from "../zebra-fxr90/zebra-websocket-processor";

/**
 * Minimal stand-in for the `ws` client: the processor only needs on/emit, readyState, terminate.
 * Defined through vi.hoisted so it exists before vi.mock's factory runs, and hand-rolled rather
 * than extending EventEmitter so the hoisted factory needs no imports.
 */
const FakeWebSocket = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  class FakeWebSocket {
    static OPEN = 1;
    static instances: FakeWebSocket[] = [];
    public readyState = 0;
    public terminate = vi.fn();
    private listeners = new Map<string, Listener[]>();

    constructor(
      public url: string,
      public options: unknown
    ) {
      FakeWebSocket.instances.push(this);
    }

    on(event: string, listener: Listener): this {
      const existing = this.listeners.get(event) ?? [];
      existing.push(listener);
      this.listeners.set(event, existing);
      return this;
    }

    emit(event: string, ...args: unknown[]): void {
      for (const listener of this.listeners.get(event) ?? []) listener(...args);
    }

    open(): void {
      this.readyState = FakeWebSocket.OPEN;
      this.emit("open");
    }
  }

  return FakeWebSocket;
});
vi.mock("ws", () => ({ default: FakeWebSocket }));

// An in-memory stand-in for the durable RFID inbox table, so the partial-frame bookkeeping is
// exercised for real rather than asserted against a mock's call log.
const inbox = vi.hoisted(() => {
  let nextIndex = 1;
  let rows: Array<{ index: number; payload: string }> = [];
  return {
    reset() {
      nextIndex = 1;
      rows = [];
    },
    rows: () => rows,
    enqueue: vi.fn((payload: string) => {
      rows.push({ index: nextIndex++, payload });
    }),
    getPending: vi.fn(() => rows.map((row) => ({ ...row }))),
    markProcessed: vi.fn((index: number) => {
      rows = rows.filter((row) => row.index !== index);
    }),
    replacePayload: vi.fn((index: number, payload: string) => {
      const row = rows.find((candidate) => candidate.index === index);
      if (row) row.payload = payload;
    })
  };
});
vi.mock("../../../database/rfidInbox-db", () => inbox);

const logRFID = vi.hoisted(() => vi.fn());
vi.mock("../rfid-log", () => ({
  logRFID,
  LogLevel: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4 }
}));

function settings(overrides: Partial<RfidSettings> = {}): RfidSettings {
  return {
    type: "zebra-fxr90",
    webSocketUrl: "reader.local",
    websocketPort: 443,
    secureWebsocket: true,
    ...overrides
  } as RfidSettings;
}

function tagMessage(idHex: string, timestamp = "2026-09-01T08:00:00Z") {
  return JSON.stringify({
    data: { eventNum: 1, format: "epc", idHex },
    timestamp,
    type: "CUSTOM"
  });
}

const BIB_101 = "00000000000000000000101";

describe("zebra-websocket-processor", () => {
  let processor: ZebraWebSocketProcessor;
  let socket: InstanceType<typeof FakeWebSocket>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    inbox.reset();
    FakeWebSocket.instances = [];
    processor = new ZebraWebSocketProcessor(settings());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function connect() {
    const connecting = processor.connect();
    socket = FakeWebSocket.instances[0];
    socket.open();
    await connecting;
  }

  describe("connect", () => {
    it("opens a secure websocket at the reader's address", async () => {
      await connect();

      expect(socket.url).toBe("wss://reader.local:443/ws");
    });

    it("uses an insecure websocket when configured to", async () => {
      processor = new ZebraWebSocketProcessor(settings({ secureWebsocket: false }));

      const connecting = processor.connect();
      FakeWebSocket.instances[0].open();
      await connecting;

      expect(FakeWebSocket.instances[0].url).toBe("ws://reader.local:443/ws");
    });

    it("announces the connection", async () => {
      const connected = vi.fn();
      processor.on("connected", connected);

      await connect();

      expect(connected).toHaveBeenCalled();
    });

    it("resolves immediately when already open", async () => {
      await connect();

      await expect(processor.connect()).resolves.toBeUndefined();
      expect(FakeWebSocket.instances).toHaveLength(1);
    });

    it("shares one attempt between concurrent callers", async () => {
      const first = processor.connect();
      const second = processor.connect();
      FakeWebSocket.instances[0].open();

      await Promise.all([first, second]);

      expect(FakeWebSocket.instances).toHaveLength(1);
    });

    it("rejects when the socket errors before opening", async () => {
      const connecting = processor.connect();
      processor.on("error", vi.fn());
      FakeWebSocket.instances[0].emit("error", new Error("handshake failed"));

      await expect(connecting).rejects.toThrow("handshake failed");
    });

    it("rejects when the socket closes before opening", async () => {
      const connecting = processor.connect();
      FakeWebSocket.instances[0].emit("close");

      await expect(connecting).rejects.toThrow("closed before connecting");
    });
  });

  describe("disconnect", () => {
    it("terminates the socket and announces the disconnect", async () => {
      await connect();
      const disconnected = vi.fn();
      processor.on("disconnected", disconnected);

      processor.disconnect();

      expect(socket.terminate).toHaveBeenCalled();
      expect(disconnected).toHaveBeenCalled();
    });

    it("announces a disconnect the reader initiated", async () => {
      await connect();
      const disconnected = vi.fn();
      processor.on("disconnected", disconnected);

      socket.emit("close");

      expect(disconnected).toHaveBeenCalled();
    });

    it("ignores a close from a socket that has already been replaced", async () => {
      await connect();
      const stale = socket;
      processor.disconnect();
      const disconnected = vi.fn();
      processor.on("disconnected", disconnected);

      stale.emit("close");

      expect(disconnected).not.toHaveBeenCalled();
    });
  });

  describe("reading tags", () => {
    beforeEach(async () => {
      await connect();
    });

    it("persists every message before processing it", () => {
      socket.emit("message", Buffer.from(tagMessage(BIB_101)));

      expect(inbox.enqueue).toHaveBeenCalled();
    });

    it("reports the bib number and time of a tag read", () => {
      const tagRead = vi.fn();
      processor.on("tag-read", tagRead);

      socket.emit("message", Buffer.from(tagMessage(BIB_101)));

      expect(tagRead).toHaveBeenCalledWith({
        bibId: 101,
        timestamp: new Date("2026-09-01T08:00:00Z")
      });
    });

    it("clears a message from the inbox once it is processed", () => {
      socket.emit("message", Buffer.from(tagMessage(BIB_101)));

      expect(inbox.rows()).toHaveLength(0);
    });

    it("reads several tags arriving in one message", () => {
      const tagRead = vi.fn();
      processor.on("tag-read", tagRead);

      socket.emit(
        "message",
        Buffer.from(tagMessage(BIB_101) + tagMessage("00000000000000000000102"))
      );

      expect(tagRead).toHaveBeenCalledTimes(2);
    });

    it("waits for the rest of a tag split across two messages", () => {
      const tagRead = vi.fn();
      processor.on("tag-read", tagRead);
      const whole = tagMessage(BIB_101);

      socket.emit("message", Buffer.from(whole.slice(0, 20)));
      expect(tagRead).not.toHaveBeenCalled();

      socket.emit("message", Buffer.from(whole.slice(20)));

      expect(tagRead).toHaveBeenCalledWith(expect.objectContaining({ bibId: 101 }));
    });

    it("keeps the leftover of a partially consumed message in the inbox", () => {
      const whole = tagMessage(BIB_101);
      socket.emit("message", Buffer.from(whole + '{"partial":'));

      expect(inbox.rows()).toHaveLength(1);
      expect(inbox.rows()[0].payload).toBe('{"partial":');
    });

    it("does not treat a brace inside a string as the end of a frame", () => {
      const tagRead = vi.fn();
      processor.on("tag-read", tagRead);
      const message = JSON.stringify({
        data: { eventNum: 1, format: "epc", idHex: BIB_101 },
        timestamp: "2026-09-01T08:00:00Z",
        type: "CUSTOM",
        note: 'a } brace and an escaped \\" quote'
      });

      socket.emit("message", Buffer.from(message));

      expect(tagRead).toHaveBeenCalledWith(expect.objectContaining({ bibId: 101 }));
    });

    it("ignores a tag id containing hex digits", () => {
      const tagRead = vi.fn();
      const errored = vi.fn();
      processor.on("tag-read", tagRead);
      processor.on("error", errored);

      socket.emit("message", Buffer.from(tagMessage("0000000000000000000010A")));

      expect(tagRead).not.toHaveBeenCalled();
      expect(errored).not.toHaveBeenCalled();
      expect(inbox.rows()).toHaveLength(0);
    });

    it("reports a message whose shape it does not recognise", () => {
      const errored = vi.fn();
      processor.on("error", errored);

      socket.emit("message", Buffer.from(JSON.stringify({ data: { nope: true } })));

      expect(errored).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid RFID message structure" })
      );
    });

    it("rejects a message carrying an unparseable timestamp", () => {
      const errored = vi.fn();
      processor.on("error", errored);

      socket.emit("message", Buffer.from(tagMessage(BIB_101, "not a date")));

      expect(errored).toHaveBeenCalled();
    });

    it("discards a payload with no JSON at all rather than retrying forever", () => {
      socket.emit("message", Buffer.from("complete nonsense"));

      expect(inbox.rows()).toHaveLength(0);
    });

    it("keeps running when the inbox cannot store a message", () => {
      inbox.enqueue.mockImplementationOnce(() => {
        throw new Error("database locked");
      });

      expect(() => socket.emit("message", Buffer.from(tagMessage(BIB_101)))).not.toThrow();
      expect(logRFID).toHaveBeenCalled();
    });
  });

  describe("recovering messages stored earlier", () => {
    it("processes anything left in the inbox as soon as it connects", async () => {
      inbox.enqueue(tagMessage(BIB_101));
      const tagRead = vi.fn();
      processor.on("tag-read", tagRead);

      await connect();

      expect(tagRead).toHaveBeenCalledWith(expect.objectContaining({ bibId: 101 }));
    });
  });
});
