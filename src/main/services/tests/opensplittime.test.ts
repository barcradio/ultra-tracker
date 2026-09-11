import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunnerDB } from "../../../shared/models";

const storeMock = vi.hoisted(() => {
  const data = new Map<string, unknown>();
  return {
    data,
    get: vi.fn((key: string) => data.get(key)),
    set: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    })
  };
});
vi.mock("../../lib/store", () => ({ appStore: storeMock }));

const safeStorage = vi.hoisted(() => ({
  isEncryptionAvailable: vi.fn(() => true),
  encryptString: vi.fn((value: string) => Buffer.from(`enc:${value}`)),
  decryptString: vi.fn((buffer: Buffer) => buffer.toString().replace(/^enc:/, ""))
}));
vi.mock("electron", () => ({ safeStorage }));

const statusDb = vi.hoisted(() => ({
  getPushStatus: vi.fn(),
  setPushStatus: vi.fn(),
  clearPushStatus: vi.fn()
}));
vi.mock("../../database/opensplittimeStatus-db", () => statusDb);

const emitConnectionStatus = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/connectivity-emitter", () => ({ emitConnectionStatus }));

const emitRunnersTableChanged = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/runner-data-emitter", () => ({ emitRunnersTableChanged }));

const sendToastToRenderer = vi.hoisted(() => vi.fn());
vi.mock("../../ipc/toast-ipc", () => ({ sendToastToRenderer }));

type Service = typeof import("../opensplittime");

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body))
  };
}

// The service keeps the token, environment and pause flag in module scope, so each test needs a
// freshly imported copy to start from a known state.
async function loadService(): Promise<Service> {
  vi.resetModules();
  return import("../opensplittime");
}

async function signedIn(): Promise<Service> {
  const service = await loadService();
  fetchMock.mockResolvedValueOnce(
    jsonResponse({ token: "test-token", expiration: "2026-12-31T00:00:00Z" })
  );
  await service.authenticate("ada@example.com", "secret", false);
  fetchMock.mockReset();
  return service;
}

function configureEventGroup(environment: "production" | "staging" = "staging") {
  storeMock.data.set("event.openSplitTime", {
    [environment]: { name: "bear-100", id: 7 }
  });
}

function runner(overrides: Partial<RunnerDB> = {}): RunnerDB {
  return {
    index: 1,
    bibId: 101,
    stationId: 3,
    timeIn: new Date("2026-09-01T08:00:00Z"),
    timeOut: null,
    timeModified: new Date("2026-09-01T08:00:00Z"),
    note: "",
    sent: false,
    status: 0,
    ...overrides
  } as RunnerDB;
}

// Every test re-imports the service to reset its module-level state, so these tests do real
// module-graph work; give them more headroom than the 5s default when the machine is busy.
describe("opensplittime service", { timeout: 30_000 }, () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    storeMock.data.clear();
    storeMock.data.set("station.identifier", "3-hardware");
    storeMock.data.set("station.name", "Hardware Ranch");
    storeMock.data.set("station.openSplitTimeSplitName", "Hardware Ranch");
    storeMock.data.set("openSplitTime.email", "");
    storeMock.data.set("openSplitTime.encryptedPassword", "");
    vi.clearAllMocks();
    safeStorage.isEncryptionAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("authenticate", () => {
    it("stores the token and reports the expiration", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue(
        jsonResponse({ token: "test-token", expiration: "2026-12-31T00:00:00Z" })
      );

      const result = await service.authenticate("ada@example.com", "secret", false);

      expect(result.expiration).toBe("2026-12-31T00:00:00Z");
      expect(service.getAuthStatus()).toEqual({
        authenticated: true,
        expiration: "2026-12-31T00:00:00Z"
      });
    });

    it("posts the credentials as form data", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue(jsonResponse({ token: "t", expiration: "e" }));

      await service.authenticate("ada@example.com", "secret", false);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/v1/auth");
      expect(init.method).toBe("POST");
      expect(init.body).toContain("user%5Bemail%5D=ada%40example.com");
    });

    it("rejects an incomplete response from the server", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue(jsonResponse({ token: "only-a-token" }));

      await expect(service.authenticate("ada@example.com", "secret", false)).rejects.toThrow(
        /incomplete authentication response/
      );
    });

    it("surfaces the server's error message", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue(jsonResponse({ error: "Bad credentials" }, 401));

      await expect(service.authenticate("ada@example.com", "nope", false)).rejects.toThrow(
        /Bad credentials/
      );
    });

    it("leaves pushing paused until an event group is configured", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue(jsonResponse({ token: "t", expiration: "e" }));

      await service.authenticate("ada@example.com", "secret", false);

      expect(service.isOpenSplitTimePushPaused()).toBe(true);
    });

    it("saves the password encrypted when asked to remember it", async () => {
      configureEventGroup();
      const service = await loadService();
      fetchMock.mockResolvedValue(jsonResponse({ token: "t", expiration: "e" }));

      const result = await service.authenticate("ada@example.com", "secret", true);

      expect(result.credentialsSaved).toBe(true);
      expect(safeStorage.encryptString).toHaveBeenCalledWith("secret");
      expect(storeMock.data.get("openSplitTime.email")).toBe("ada@example.com");
      expect(storeMock.data.get("openSplitTime.encryptedPassword")).not.toContain("secret");
    });

    it("clears any previously saved password when asked not to remember", async () => {
      storeMock.data.set("openSplitTime.email", "old@example.com");
      storeMock.data.set("openSplitTime.encryptedPassword", "cached");
      const service = await loadService();
      fetchMock.mockResolvedValue(jsonResponse({ token: "t", expiration: "e" }));

      await service.authenticate("ada@example.com", "secret", false);

      expect(storeMock.data.get("openSplitTime.email")).toBe("");
      expect(storeMock.data.get("openSplitTime.encryptedPassword")).toBe("");
    });

    it("does not save the password when the OS cannot encrypt it", async () => {
      safeStorage.isEncryptionAvailable.mockReturnValue(false);
      const service = await loadService();
      fetchMock.mockResolvedValue(jsonResponse({ token: "t", expiration: "e" }));

      const result = await service.authenticate("ada@example.com", "secret", true);

      expect(result.credentialsSaved).toBe(false);
      expect(safeStorage.encryptString).not.toHaveBeenCalled();
    });
  });

  describe("a rejected token", () => {
    it("signs the operator out when the server returns 401", async () => {
      const service = await signedIn();
      fetchMock.mockResolvedValue(jsonResponse({ error: "expired" }, 401));

      await expect(service.getEventGroup("bear-100")).rejects.toThrow();

      expect(service.getAuthStatus().authenticated).toBe(false);
      expect(service.isOpenSplitTimePushPaused()).toBe(true);
    });
  });

  describe("saved credentials", () => {
    it("reports none available when nothing is stored", async () => {
      const service = await loadService();

      expect(service.getSavedCredentials()).toEqual({ email: "", available: false });
    });

    it("reports the stored email when a password is saved", async () => {
      storeMock.data.set("openSplitTime.email", "ada@example.com");
      storeMock.data.set("openSplitTime.encryptedPassword", "cipher");
      const service = await loadService();

      expect(service.getSavedCredentials()).toEqual({
        email: "ada@example.com",
        available: true
      });
    });

    it("signs in with the decrypted saved password", async () => {
      storeMock.data.set("openSplitTime.email", "ada@example.com");
      storeMock.data.set(
        "openSplitTime.encryptedPassword",
        Buffer.from("enc:secret").toString("base64")
      );
      const service = await loadService();
      fetchMock.mockResolvedValue(jsonResponse({ token: "t", expiration: "e" }));

      await service.authenticateSaved();

      expect(fetchMock.mock.calls[0][1].body).toContain("secret");
    });

    // Availability requires BOTH halves; an email with no stored password must not count.
    it("reports none available when only an email is stored", async () => {
      storeMock.data.set("openSplitTime.email", "ada@example.com");
      storeMock.data.set("openSplitTime.encryptedPassword", "");
      const service = await loadService();

      expect(service.getSavedCredentials().available).toBe(false);
    });

    it("reports none available when only a password is stored", async () => {
      storeMock.data.set("openSplitTime.email", "");
      storeMock.data.set("openSplitTime.encryptedPassword", "cipher");
      const service = await loadService();

      expect(service.getSavedCredentials().available).toBe(false);
    });

    it("refuses when nothing is saved", async () => {
      const service = await loadService();

      await expect(service.authenticateSaved()).rejects.toThrow(/credentials are unavailable/);
    });

    it("refuses when the OS cannot decrypt", async () => {
      safeStorage.isEncryptionAvailable.mockReturnValue(false);
      const service = await loadService();

      await expect(service.authenticateSaved()).rejects.toThrow(/credentials are unavailable/);
    });

    it("clears the saved credentials on request", async () => {
      storeMock.data.set("openSplitTime.email", "ada@example.com");
      const service = await loadService();

      service.clearSavedCredentials();

      expect(storeMock.data.get("openSplitTime.email")).toBe("");
    });
  });

  describe("clearAuthentication", () => {
    it("signs the operator out and pauses pushing", async () => {
      const service = await signedIn();

      service.clearAuthentication();

      expect(service.getAuthStatus().authenticated).toBe(false);
      expect(service.isOpenSplitTimePushPaused()).toBe(true);
    });
  });

  describe("environments", () => {
    it("lists only the environments the stations file configured", async () => {
      storeMock.data.set("event.openSplitTime", {
        staging: { name: "bear-100-staging", id: 1 },
        production: { name: "", id: 0 }
      });
      const service = await loadService();

      expect(service.listOpenSplitTimeEnvironments()).toEqual([
        { environment: "staging", name: "bear-100-staging" }
      ]);
    });

    it("defaults to staging when the stations file configures it", async () => {
      configureEventGroup("staging");
      const service = await loadService();

      expect(service.getOpenSplitTimeEnvironment()).toBe("staging");
    });

    it("defaults to production when only production is configured", async () => {
      configureEventGroup("production");
      const service = await loadService();

      expect(service.getOpenSplitTimeEnvironment()).toBe("production");
    });

    it("signs the operator out when the environment changes", async () => {
      const service = await signedIn();

      service.setOpenSplitTimeEnvironment("production");

      expect(service.getOpenSplitTimeEnvironment()).toBe("production");
      expect(service.getAuthStatus().authenticated).toBe(false);
    });

    it("does nothing when asked to switch to the environment already in use", async () => {
      configureEventGroup("staging");
      const service = await signedIn();

      service.setOpenSplitTimeEnvironment("staging");

      expect(service.getAuthStatus().authenticated).toBe(true);
    });
  });

  describe("isOpenSplitTimeEventGroupConfigured", () => {
    it("is false when the stations file names no event group", async () => {
      const service = await loadService();

      expect(service.isOpenSplitTimeEventGroupConfigured()).toBe(false);
    });

    it("is true when the current environment has an event group", async () => {
      configureEventGroup("staging");
      const service = await loadService();

      expect(service.isOpenSplitTimeEventGroupConfigured()).toBe(true);
    });
  });

  describe("setOpenSplitTimePushPaused", () => {
    it("requires the operator to be signed in", async () => {
      const service = await loadService();

      expect(() => service.setOpenSplitTimePushPaused(false)).toThrow(/authentication is required/);
    });

    it("refuses to start pushing without a configured event group", async () => {
      const service = await signedIn();

      expect(() => service.setOpenSplitTimePushPaused(false)).toThrow(/not configured/);
    });

    it("starts pushing once an event group is configured", async () => {
      configureEventGroup();
      const service = await signedIn();

      service.setOpenSplitTimePushPaused(false);

      expect(service.isOpenSplitTimePushPaused()).toBe(false);
    });

    it("pauses pushing on request", async () => {
      configureEventGroup();
      const service = await signedIn();
      service.setOpenSplitTimePushPaused(false);

      service.setOpenSplitTimePushPaused(true);

      expect(service.isOpenSplitTimePushPaused()).toBe(true);
    });
  });

  describe("connectivity", () => {
    it("reports both probes as connected when they succeed", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      await expect(service.getConnectionStatus()).resolves.toEqual({
        internet: "connected",
        openSplitTime: "connected"
      });
    });

    it("reports disconnected when a probe throws", async () => {
      const service = await loadService();
      fetchMock.mockRejectedValue(new Error("offline"));

      await expect(service.getConnectionStatus()).resolves.toEqual({
        internet: "disconnected",
        openSplitTime: "disconnected"
      });
    });

    it("treats a server error as reachable, since something answered", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue({ ok: false, status: 404 });

      const status = await service.getConnectionStatus();

      expect(status.openSplitTime).toBe("connected");
    });

    // The cut-off is `status < 500`, so 500 itself is unreachable and 499 is reachable.
    it("treats exactly 500 as unreachable", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue({ ok: false, status: 500 });

      expect((await service.getConnectionStatus()).openSplitTime).toBe("disconnected");
    });

    it("treats 499 as reachable", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue({ ok: false, status: 499 });

      expect((await service.getConnectionStatus()).openSplitTime).toBe("connected");
    });

    it("treats a 5xx as unreachable", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue({ ok: false, status: 503 });

      const status = await service.getConnectionStatus();

      expect(status.openSplitTime).toBe("disconnected");
    });

    it("starts out disconnected before any probe runs", async () => {
      const service = await loadService();

      expect(service.getCachedConnectionStatus()).toEqual({
        internet: "disconnected",
        openSplitTime: "disconnected",
        checking: false
      });
    });

    it("caches the result of a forced recheck and tells the renderer", async () => {
      const service = await loadService();
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      const status = await service.forceConnectivityRecheck();

      expect(status).toEqual({
        internet: "connected",
        openSplitTime: "connected",
        checking: false
      });
      expect(emitConnectionStatus).toHaveBeenCalledWith(
        expect.objectContaining({ checking: true })
      );
      expect(service.getCachedConnectionStatus().checking).toBe(false);
    });

    it("polls in the background once the monitor starts", async () => {
      vi.useFakeTimers();
      const service = await loadService();
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      service.startConnectivityMonitor();
      await vi.advanceTimersByTimeAsync(0);
      const callsAfterStart = fetchMock.mock.calls.length;
      await vi.advanceTimersByTimeAsync(15_000);

      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterStart);
    });

    it("only starts the monitor once", async () => {
      vi.useFakeTimers();
      const service = await loadService();
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      service.startConnectivityMonitor();
      await vi.advanceTimersByTimeAsync(0);
      const callsAfterFirstStart = fetchMock.mock.calls.length;
      service.startConnectivityMonitor();
      await vi.advanceTimersByTimeAsync(0);

      expect(fetchMock.mock.calls.length).toBe(callsAfterFirstStart);
    });
  });

  describe("getEventGroup", () => {
    it("requires a token", async () => {
      const service = await loadService();

      await expect(service.getEventGroup("bear-100")).rejects.toThrow(/authentication is required/);
    });

    it("requests the event group with the bearer token", async () => {
      const service = await signedIn();
      fetchMock.mockResolvedValue(jsonResponse({ data: { id: 7 } }));

      await service.getEventGroup("bear 100");

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain("/event_groups/bear%20100");
      expect(init.headers.Authorization).toBe("Bearer test-token");
    });
  });

  describe("submitRawTimes", () => {
    it("sends the records as a jsonapi batch", async () => {
      const service = await signedIn();
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.submitRawTimes("bear-100", [
        { source: "3-hardware", ["sub_split_kind"]: "in" } as never
      ]);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain("/event_groups/bear-100/import");
      const body = JSON.parse(init.body);
      expect(body.data_format).toBe("jsonapi_batch");
      expect(body.data[0].type).toBe("raw_time");
    });
  });

  describe("pushTimeRecordUpdate", () => {
    async function readyToPush() {
      configureEventGroup();
      const service = await signedIn();
      service.setOpenSplitTimePushPaused(false);
      return service;
    }

    it("does nothing while pushing is paused", async () => {
      configureEventGroup();
      const service = await signedIn();
      service.setOpenSplitTimePushPaused(true);

      const outcome = await service.pushTimeRecordUpdate(runner());

      expect(outcome).toEqual({ pushed: false });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("starts pushing automatically when signing in with an event group configured", async () => {
      configureEventGroup();
      const service = await signedIn();

      expect(service.isOpenSplitTimePushPaused()).toBe(false);
    });

    it("pushes anyway when the operator forces it", async () => {
      configureEventGroup();
      const service = await signedIn();
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      const outcome = await service.pushTimeRecordUpdate(runner(), false, { force: true });

      expect(outcome.pushed).toBe(true);
    });

    it("sends the in time as a raw time record", async () => {
      const service = await readyToPush();
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.pushTimeRecordUpdate(runner());

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.data).toHaveLength(1);
      // The OpenSplitTime API uses snake_case field names, matching the service's own payload.
      /* eslint-disable camelcase */
      expect(body.data[0].attributes).toMatchObject({
        source: "3-hardware",
        sub_split_kind: "in",
        split_name: "Hardware Ranch",
        bib_number: "101"
      });
      /* eslint-enable camelcase */
    });

    it("sends both times when the runner has been through", async () => {
      const service = await readyToPush();
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.pushTimeRecordUpdate(runner({ timeOut: new Date("2026-09-01T09:00:00Z") }));

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.data).toHaveLength(2);
    });

    it("floors a duplicate's fractional bib to the real bib number", async () => {
      const service = await readyToPush();
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.pushTimeRecordUpdate(runner({ bibId: 101.2 }));

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.data[0].attributes.bib_number).toBe("101");
    });

    it("passes the stopped-here flag through", async () => {
      const service = await readyToPush();
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.pushTimeRecordUpdate(runner(), true);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.data[0].attributes.stopped_here).toBe("true");
    });

    it("omits the stopped-here flag when it is unknown", async () => {
      const service = await readyToPush();
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.pushTimeRecordUpdate(runner());

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.data[0].attributes.stopped_here).toBeUndefined();
    });

    it("sends nothing when the record has no times", async () => {
      const service = await readyToPush();

      const outcome = await service.pushTimeRecordUpdate(runner({ timeIn: null, timeOut: null }));

      expect(outcome).toEqual({ pushed: false });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("sends only the kinds the split accepts", async () => {
      storeMock.data.set("event.openSplitTime", {
        staging: { name: "bear-100", id: 7, splitEntryKinds: { "Hardware Ranch": ["in"] } }
      });
      const service = await signedIn();
      service.setOpenSplitTimePushPaused(false);
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.pushTimeRecordUpdate(runner({ timeOut: new Date("2026-09-01T09:00:00Z") }));

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].attributes.sub_split_kind).toBe("in");
    });

    // An empty kinds array carries no information, so the station's entry mode must still win.
    it("falls back to the station's entry mode when the split lists no kinds", async () => {
      storeMock.data.set("event.openSplitTime", {
        staging: { name: "bear-100", id: 7, splitEntryKinds: { "Hardware Ranch": [] } }
      });
      storeMock.data.set("station.entrymode", 2); // in-only
      const service = await signedIn();
      service.setOpenSplitTimePushPaused(false);
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.pushTimeRecordUpdate(runner({ timeOut: new Date("2026-09-01T09:00:00Z") }));

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].attributes.sub_split_kind).toBe("in");
    });

    it("falls back to the station's entry mode when the split kinds are unknown", async () => {
      configureEventGroup();
      storeMock.data.set("station.entrymode", 3); // out-only
      const service = await signedIn();
      service.setOpenSplitTimePushPaused(false);
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.pushTimeRecordUpdate(runner({ timeOut: new Date("2026-09-01T09:00:00Z") }));

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].attributes.sub_split_kind).toBe("out");
    });

    it("records a successful push and refreshes the runners table", async () => {
      const service = await readyToPush();
      fetchMock.mockResolvedValue(jsonResponse({ accepted: 1 }));

      await service.pushTimeRecordUpdate(runner());

      expect(statusDb.setPushStatus).toHaveBeenCalledWith(101, "success");
      expect(emitRunnersTableChanged).toHaveBeenCalled();
    });

    it("records a failed push and warns the operator", async () => {
      const service = await readyToPush();
      fetchMock.mockResolvedValue(jsonResponse({ error: "split not found" }, 500));

      const outcome = await service.pushTimeRecordUpdate(runner());

      expect(outcome.pushed).toBe(false);
      expect(outcome.error).toContain("split not found");
      expect(statusDb.setPushStatus).toHaveBeenCalledWith(
        101,
        "error",
        expect.stringContaining("split not found")
      );
      expect(sendToastToRenderer).toHaveBeenCalledWith(
        expect.objectContaining({ type: "warning" })
      );
    });

    it("refuses to push when the station is not configured", async () => {
      configureEventGroup();
      storeMock.data.delete("station.name");
      const service = await signedIn();

      await expect(service.pushTimeRecordUpdate(runner(), false, { force: true })).rejects.toThrow(
        /station is not configured/
      );
    });

    it("refuses to push when no event group is configured", async () => {
      const service = await signedIn();

      await expect(service.pushTimeRecordUpdate(runner(), false, { force: true })).rejects.toThrow(
        /event group is not configured/
      );
    });
  });

  describe("getOpenSplitTimePushStatus", () => {
    it("returns nothing for a bib that has never been pushed", async () => {
      statusDb.getPushStatus.mockReturnValue(undefined);
      const service = await loadService();

      expect(service.getOpenSplitTimePushStatus(101)).toBeUndefined();
    });

    it("returns the stored outcome and error", async () => {
      statusDb.getPushStatus.mockReturnValue({ status: "error", error: "rejected" });
      const service = await loadService();

      expect(service.getOpenSplitTimePushStatus(101)).toEqual({
        status: "error",
        error: "rejected"
      });
    });
  });

  describe("syncEventGroupId", () => {
    it("corrects the stored event group id when OpenSplitTime disagrees", async () => {
      configureEventGroup();
      const service = await signedIn();
      fetchMock.mockResolvedValue(jsonResponse({ data: { id: 42, attributes: {} } }));

      await service.syncEventGroupId();

      const stored = storeMock.data.get("event.openSplitTime") as Record<string, { id: number }>;
      expect(stored.staging.id).toBe(42);
    });

    it("does nothing when no event group is configured", async () => {
      const service = await signedIn();

      await service.syncEventGroupId();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("keeps the configured id when the lookup fails", async () => {
      configureEventGroup();
      const service = await signedIn();
      fetchMock.mockRejectedValue(new Error("offline"));

      await service.syncEventGroupId();

      const stored = storeMock.data.get("event.openSplitTime") as Record<string, { id: number }>;
      expect(stored.staging.id).toBe(7);
    });
  });

  describe("syncSplitEntryKinds", () => {
    it("stores the entry kinds the event group reports for each split", async () => {
      configureEventGroup();
      const service = await signedIn();
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: {
            id: 7,
            attributes: {
              dataEntryGroups: [
                {
                  entries: [
                    { splitName: "Hardware Ranch", subSplitKind: "in" },
                    { splitName: "Hardware Ranch", subSplitKind: "out" },
                    { splitName: "Finish", subSplitKind: "inout" }
                  ]
                }
              ]
            }
          }
        })
      );

      await service.syncSplitEntryKinds();

      const stored = storeMock.data.get("event.openSplitTime") as Record<
        string,
        { splitEntryKinds: Record<string, string[]> }
      >;
      expect(stored.staging.splitEntryKinds["Hardware Ranch"]).toEqual(["in", "out"]);
      expect(stored.staging.splitEntryKinds.Finish).toEqual(["in", "out"]);
    });

    it("ignores entries with no split name or an unrecognised kind", async () => {
      configureEventGroup();
      const service = await signedIn();
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: {
            id: 7,
            attributes: {
              dataEntryGroups: [
                {
                  entries: [
                    { splitName: "   ", subSplitKind: "in" },
                    { splitName: "Finish", subSplitKind: "sideways" }
                  ]
                }
              ]
            }
          }
        })
      );

      await service.syncSplitEntryKinds();

      const stored = storeMock.data.get("event.openSplitTime") as Record<
        string,
        { splitEntryKinds: Record<string, string[]> }
      >;
      expect(stored.staging.splitEntryKinds).toEqual({});
    });

    it("does nothing when no event group is configured", async () => {
      const service = await loadService();

      await service.syncSplitEntryKinds();

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
