import EventEmitter from "events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RfidSettings } from "../../../../shared/models";
import { ZebraRestClient } from "../zebra-fxr90/zebra-rest-client";

const httpsRequest = vi.hoisted(() => vi.fn());
vi.mock("node:https", () => ({ default: { request: httpsRequest } }));

vi.mock("../rfid-log", () => ({
  logRFID: vi.fn(),
  LogLevel: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4 }
}));

const PINNED_CERT = "5ecb6929";

interface ReplyOptions {
  status?: number;
  statusMessage?: string;
  body?: unknown;
  networkErrorCode?: string;
  certificate?: { serialNumber?: string; CN?: string | string[] } | null;
}

/** Captures what the client sent so assertions can inspect the request. */
const sent: Array<{
  url: string;
  options: { method: string; headers: Record<string, string> };
  body?: string;
}> = [];

/**
 * Stands in for https.request: builds a fake ClientRequest, optionally hands it a TLS socket so
 * the client's certificate pinning runs, then delivers a canned response.
 */
function respondWith(replies: ReplyOptions | ReplyOptions[]) {
  const queue = Array.isArray(replies) ? [...replies] : [replies];

  httpsRequest.mockImplementation((url, options, callback) => {
    const reply = queue.length > 1 ? (queue.shift() as ReplyOptions) : queue[0];
    const req = new EventEmitter() as EventEmitter & {
      setTimeout: (ms: number, cb: () => void) => void;
      write: (chunk: string) => void;
      end: () => void;
      destroy: (error?: Error) => void;
      destroyed: boolean;
    };
    let body: string | undefined;
    req.destroyed = false;

    req.setTimeout = vi.fn();
    req.write = (chunk: string) => {
      body = chunk;
    };
    req.destroy = (error?: Error) => {
      req.destroyed = true;
      if (error) setImmediate(() => req.emit("error", error));
    };
    req.end = () => {
      sent.push({ url, options, body });

      const certificate =
        reply.certificate === undefined
          ? { serialNumber: PINNED_CERT, CN: "fxr90" }
          : reply.certificate;
      if (certificate !== null) {
        const socket = {
          getPeerCertificate: () => ({
            raw: Buffer.from("cert"),
            subject: { CN: certificate.CN },
            ...certificate
          })
        };
        req.emit("socket", socket);
      }

      setImmediate(() => {
        if (req.destroyed) return;

        if (reply.networkErrorCode) {
          const error = new Error("socket failure") as Error & { code?: string };
          error.code = reply.networkErrorCode;
          req.emit("error", error);
          return;
        }

        const res = new EventEmitter() as EventEmitter & {
          statusCode?: number;
          statusMessage?: string;
        };
        res.statusCode = reply.status ?? 200;
        res.statusMessage = reply.statusMessage ?? "OK";
        callback(res);
        const text = reply.body === undefined ? "" : JSON.stringify(reply.body);
        if (text) res.emit("data", Buffer.from(text));
        res.emit("end");
      });
    };

    return req;
  });
}

function settings(overrides: Partial<RfidSettings> = {}): RfidSettings {
  return {
    type: "zebra-fxr90",
    restApiUrl: "reader.local",
    webSocketUrl: "reader.local",
    websocketPort: 443,
    secureWebsocket: true,
    userName: "admin",
    password: "secret",
    sslCert: PINNED_CERT,
    status: 0,
    ...overrides
  } as RfidSettings;
}

async function loggedInClient(extra: ReplyOptions[] = []) {
  const client = new ZebraRestClient(settings());
  respondWith([{ body: { message: "a-token" } }, ...extra]);
  await client.login();
  return client;
}

describe("zebra-rest-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sent.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("login", () => {
    it("stores the token the reader returns", async () => {
      const client = new ZebraRestClient(settings());
      respondWith({ body: { message: "a-token" } });

      await expect(client.login()).resolves.toBe(true);
      expect(client.getLastError()).toBeUndefined();
    });

    it("sends HTTP basic credentials to the login endpoint", async () => {
      const client = new ZebraRestClient(settings());
      respondWith({ body: { message: "a-token" } });

      await client.login();

      expect(sent[0].url).toBe("https://reader.local/cloud/localRestLogin");
      expect(sent[0].options.headers.Authorization).toBe(
        `Basic ${Buffer.from("admin:secret").toString("base64")}`
      );
    });

    it("refuses to try without a username and password", async () => {
      const client = new ZebraRestClient(settings({ password: "" }));

      await expect(client.login()).resolves.toBe(false);
      expect(client.getLastError()).toMatch(/username\/password is not configured/);
      expect(httpsRequest).not.toHaveBeenCalled();
    });

    it("explains a rejected password rather than echoing a raw 401", async () => {
      const client = new ZebraRestClient(settings());
      respondWith({ status: 401, statusMessage: "Unauthorized" });

      await expect(client.login()).resolves.toBe(false);
      expect(client.getLastError()).toMatch(/invalid username or password/);
    });

    it("reports a server-side failure with its body", async () => {
      const client = new ZebraRestClient(settings());
      respondWith({ status: 500, statusMessage: "Server Error", body: { detail: "boom" } });

      await expect(client.login()).resolves.toBe(false);
      expect(client.getLastError()).toMatch(/500/);
    });

    it("reports a response that carries no token", async () => {
      const client = new ZebraRestClient(settings());
      respondWith({ body: { notAToken: true } });

      await expect(client.login()).resolves.toBe(false);
      expect(client.getLastError()).toMatch(/did not include a token/);
    });

    it("refuses to connect without a pinned certificate configured", async () => {
      const client = new ZebraRestClient(settings({ sslCert: "" }));

      await expect(client.login()).resolves.toBe(false);
      expect(client.getLastError()).toMatch(/certificate pin \(sslCert\) is not configured/);
    });
  });

  describe("certificate pinning", () => {
    it("accepts a reader whose certificate serial matches the pin", async () => {
      const client = new ZebraRestClient(settings());
      respondWith({ body: { message: "a-token" }, certificate: { serialNumber: "5E:CB:69:29" } });

      await expect(client.login()).resolves.toBe(true);
    });

    it("accepts a reader whose common name matches the pin", async () => {
      const client = new ZebraRestClient(settings({ sslCert: "fxr90c94e1c" }));
      respondWith({
        body: { message: "a-token" },
        certificate: { serialNumber: "unrelated", CN: "fxr90c94e1c" }
      });

      await expect(client.login()).resolves.toBe(true);
    });

    it("rejects a reader presenting an unexpected certificate", async () => {
      const client = new ZebraRestClient(settings());
      respondWith({
        body: { message: "a-token" },
        certificate: { serialNumber: "deadbeef", CN: "impostor" }
      });

      await expect(client.login()).resolves.toBe(false);
      expect(client.getLastError()).toMatch(/certificate did not match pinned cert/);
    });
  });

  describe("network failures", () => {
    it.each([
      ["ENOTFOUND", /Could not resolve RFID reader host/],
      ["ECONNREFUSED", /refused the connection/],
      ["ETIMEDOUT", /timed out or was reset/],
      ["ECONNRESET", /timed out or was reset/],
      ["EHOSTUNREACH", /unreachable on the network/]
    ])("explains %s in terms an operator can act on", async (code, expected) => {
      const client = new ZebraRestClient(settings());
      respondWith({ networkErrorCode: code });

      await client.login();

      expect(client.getLastError()).toMatch(expected);
    });

    it("passes an unrecognised failure through unchanged", async () => {
      const client = new ZebraRestClient(settings());
      respondWith({ networkErrorCode: "EWEIRD" });

      await client.login();

      expect(client.getLastError()).toBe("socket failure");
    });
  });

  describe("authenticated requests", () => {
    it("refuse to run before logging in", async () => {
      const client = new ZebraRestClient(settings());

      await expect(client.getRadioActivity()).rejects.toThrow("Not authenticated");
    });

    it("carry the bearer token", async () => {
      const client = await loggedInClient();
      respondWith({ body: { radioActivity: "active" } });

      await client.getRadioActivity();

      expect(sent[sent.length - 1].options.headers.Authorization).toBe("Bearer a-token");
    });

    it("report a failing endpoint with its status", async () => {
      const client = await loggedInClient();
      respondWith({ status: 500, statusMessage: "Server Error" });

      await expect(client.getRadioActivity()).rejects.toThrow(/Request failed: 500/);
    });
  });

  describe("getRadioActivity", () => {
    it("reports an active radio", async () => {
      const client = await loggedInClient();
      respondWith({ body: { radioActivity: "ACTIVE" } });

      await expect(client.getRadioActivity()).resolves.toBe("active");
    });

    it("reports an inactive radio", async () => {
      const client = await loggedInClient();
      respondWith({ body: { radioActivity: "inactive" } });

      await expect(client.getRadioActivity()).resolves.toBe("inactive");
    });

    it("rejects a state it does not understand", async () => {
      const client = await loggedInClient();
      respondWith({ body: { radioActivity: "spinning" } });

      await expect(client.getRadioActivity()).rejects.toThrow(/valid radio activity state/);
    });
  });

  describe("start", () => {
    it("starts the radio and waits for it to go active", async () => {
      const client = await loggedInClient();
      respondWith([{ body: {} }, { body: { radioActivity: "active" } }]);

      await expect(client.start()).resolves.toBeUndefined();

      const startCall = sent.find((call) => call.url.endsWith("/cloud/start"));
      expect(startCall?.options.method).toBe("PUT");
      expect(startCall?.body).toContain("doNotPersistState");
    });

    it("tolerates a start that was already in progress", async () => {
      const client = await loggedInClient();
      respondWith([
        { status: 422, statusMessage: "Unprocessable", body: "start currently ongoing" },
        { body: { radioActivity: "active" } }
      ]);

      await expect(client.start()).resolves.toBeUndefined();
    });

    it("passes on a start failure that is not an in-progress start", async () => {
      const client = await loggedInClient();
      respondWith({ status: 500, statusMessage: "Server Error" });

      await expect(client.start()).rejects.toThrow(/Request failed: 500/);
    });
  });

  describe("stop", () => {
    it("stops the radio and waits for it to go inactive", async () => {
      const client = await loggedInClient();
      respondWith([{ body: {} }, { body: { radioActivity: "inactive" } }]);

      await expect(client.stop()).resolves.toBeUndefined();
      expect(sent.some((call) => call.url.endsWith("/cloud/stop"))).toBe(true);
    });
  });

  describe("mode", () => {
    it("returns the reader's current mode", async () => {
      const client = await loggedInClient();
      respondWith({ body: { antennas: 4 } });

      await expect(client.getMode()).resolves.toEqual({ antennas: 4 });
    });

    it("returns nothing when the mode cannot be read", async () => {
      const client = await loggedInClient();
      respondWith({ status: 500, statusMessage: "Server Error" });

      await expect(client.getMode()).resolves.toBeNull();
    });

    it("sends a parsed mode object to the reader", async () => {
      const client = await loggedInClient();
      respondWith({ body: {} });

      await client.setMode(JSON.stringify({ antennas: 2 }));

      const modeCall = sent.find((call) => call.url.endsWith("/cloud/mode"));
      expect(modeCall?.options.method).toBe("PUT");
      expect(modeCall?.body).toContain("antennas");
    });

    it("ignores a mode string that is not valid JSON", async () => {
      const client = await loggedInClient();
      respondWith({ body: {} });

      await expect(client.setMode("not json")).resolves.toBeUndefined();
      expect(sent.some((call) => call.url.endsWith("/cloud/mode"))).toBe(false);
    });
  });
});
