import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseStatus } from "../../../shared/enums";
import { initOpenSplitTimeHandlers } from "../opensplittime-ipc";

const ipcHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  }
}));

const ost = vi.hoisted(() => ({
  authenticate: vi.fn(async () => ({ authenticated: true })),
  authenticateSaved: vi.fn(async () => ({ authenticated: true })),
  clearAuthentication: vi.fn(),
  forceConnectivityRecheck: vi.fn(async () => ({ online: true })),
  getAuthStatus: vi.fn(() => ({ authenticated: false })),
  getCachedConnectionStatus: vi.fn(() => ({ online: true })),
  getEventGroup: vi.fn(async () => ({ id: 7 })),
  getOpenSplitTimeEnvironment: vi.fn(() => "production"),
  getSavedCredentials: vi.fn(() => ({ email: "ada@example.com" })),
  isOpenSplitTimeEventGroupConfigured: vi.fn(() => true),
  isOpenSplitTimePushPaused: vi.fn(() => false),
  listOpenSplitTimeEnvironments: vi.fn(() => ["production", "staging"]),
  pushTimeRecordUpdate: vi.fn(async () => ({ pushed: true })),
  setOpenSplitTimeEnvironment: vi.fn(),
  setOpenSplitTimePushPaused: vi.fn(),
  startConnectivityMonitor: vi.fn(),
  submitRawTimes: vi.fn(async () => ({ accepted: 1 }))
}));
vi.mock("../../services/opensplittime", () => ost);

const getTimeRecordbyBib = vi.hoisted(() => vi.fn());
vi.mock("../../database/timingRecords-db", () => ({ getTimeRecordbyBib }));

const getStoppedHereForBib = vi.hoisted(() => vi.fn(() => false));
vi.mock("../../database/status-db", () => ({ getStoppedHereForBib }));

function handlerFor(channel: string) {
  const handler = ipcHandlers.get(channel);
  if (!handler) throw new Error(`${channel} handler was not registered`);
  return handler;
}

describe("opensplittime-ipc", () => {
  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();
    getTimeRecordbyBib.mockReturnValue([{ bibId: 101 }, DatabaseStatus.Success, ""]);
    initOpenSplitTimeHandlers();
  });

  it("starts watching connectivity as soon as the handlers are registered", () => {
    expect(ost.startConnectivityMonitor).toHaveBeenCalled();
  });

  describe("opensplittime-authenticate", () => {
    it("signs in with trimmed credentials", async () => {
      await handlerFor("opensplittime-authenticate")(undefined, {
        email: "  ada@example.com  ",
        password: " secret ",
        saveCredentials: true
      });

      expect(ost.authenticate).toHaveBeenCalledWith("ada@example.com", "secret", true);
    });

    it("rejects a blank email", async () => {
      await expect(
        handlerFor("opensplittime-authenticate")(undefined, {
          email: "   ",
          password: "secret",
          saveCredentials: false
        })
      ).rejects.toThrow("email must be a non-empty string");
    });

    it("rejects a missing password", async () => {
      await expect(
        handlerFor("opensplittime-authenticate")(undefined, {
          email: "ada@example.com",
          saveCredentials: false
        })
      ).rejects.toThrow("password must be a non-empty string");
    });

    it("requires saveCredentials to be a boolean", async () => {
      await expect(
        handlerFor("opensplittime-authenticate")(undefined, {
          email: "ada@example.com",
          password: "secret",
          saveCredentials: "yes"
        })
      ).rejects.toThrow("saveCredentials must be a boolean");
    });
  });

  it("signs in with saved credentials", async () => {
    await handlerFor("opensplittime-authenticate-saved")(undefined);

    expect(ost.authenticateSaved).toHaveBeenCalled();
  });

  it("returns the saved credentials", () => {
    expect(handlerFor("opensplittime-get-saved-credentials")(undefined)).toEqual({
      email: "ada@example.com"
    });
  });

  it("returns the auth status", () => {
    expect(handlerFor("opensplittime-get-auth-status")(undefined)).toEqual({
      authenticated: false
    });
  });

  it("returns the cached connection status", () => {
    expect(handlerFor("opensplittime-get-connection-status")(undefined)).toEqual({ online: true });
  });

  it("forces a connectivity recheck", async () => {
    await handlerFor("opensplittime-recheck-connection")(undefined);

    expect(ost.forceConnectivityRecheck).toHaveBeenCalled();
  });

  it("clears the stored authentication", () => {
    handlerFor("opensplittime-clear-authentication")(undefined);

    expect(ost.clearAuthentication).toHaveBeenCalled();
  });

  it("lists the environments alongside the current one", () => {
    expect(handlerFor("opensplittime-get-environments")(undefined)).toEqual({
      environments: ["production", "staging"],
      current: "production"
    });
  });

  describe("opensplittime-set-environment", () => {
    it("switches to a known environment", () => {
      handlerFor("opensplittime-set-environment")(undefined, { environment: "staging" });

      expect(ost.setOpenSplitTimeEnvironment).toHaveBeenCalledWith("staging");
    });

    it("rejects an unknown environment", () => {
      expect(() =>
        handlerFor("opensplittime-set-environment")(undefined, { environment: "sandbox" })
      ).toThrow("environment must be 'production' or 'staging'");
    });
  });

  describe("opensplittime-get-event-group", () => {
    it("looks up the event group", async () => {
      await handlerFor("opensplittime-get-event-group")(undefined, {
        eventGroupIdOrSlug: " bear-100 "
      });

      expect(ost.getEventGroup).toHaveBeenCalledWith("bear-100");
    });

    it("rejects a blank identifier", () => {
      expect(() =>
        handlerFor("opensplittime-get-event-group")(undefined, { eventGroupIdOrSlug: "" })
      ).toThrow("eventGroupIdOrSlug must be a non-empty string");
    });
  });

  it("reports whether pushing is paused", () => {
    expect(handlerFor("opensplittime-get-push-paused")(undefined)).toEqual({ paused: false });
  });

  it("reports whether the event group is configured", () => {
    expect(handlerFor("opensplittime-get-event-group-configured")(undefined)).toEqual({
      configured: true
    });
  });

  describe("opensplittime-set-push-paused", () => {
    it("pauses pushing", () => {
      handlerFor("opensplittime-set-push-paused")(undefined, { paused: true });

      expect(ost.setOpenSplitTimePushPaused).toHaveBeenCalledWith(true);
    });

    it("requires a boolean", () => {
      expect(() =>
        handlerFor("opensplittime-set-push-paused")(undefined, { paused: "yes" })
      ).toThrow("paused must be a boolean");
    });
  });

  describe("opensplittime-submit-raw-times", () => {
    it("submits the supplied raw times", () => {
      const records = [{ bibNumber: "101" }];

      handlerFor("opensplittime-submit-raw-times")(undefined, {
        eventGroupIdOrSlug: "bear-100",
        records
      });

      expect(ost.submitRawTimes).toHaveBeenCalledWith("bear-100", records);
    });

    it("rejects an empty batch", () => {
      expect(() =>
        handlerFor("opensplittime-submit-raw-times")(undefined, {
          eventGroupIdOrSlug: "bear-100",
          records: []
        })
      ).toThrow("records must contain at least one raw time");
    });

    it("rejects a batch larger than the API allows", () => {
      expect(() =>
        handlerFor("opensplittime-submit-raw-times")(undefined, {
          eventGroupIdOrSlug: "bear-100",
          records: new Array(101).fill({ bibNumber: "101" })
        })
      ).toThrow("records must contain no more than 100 raw times");
    });
  });

  describe("opensplittime-push-record", () => {
    it("force-pushes the record for the requested bib", async () => {
      await handlerFor("opensplittime-push-record")(undefined, { bibId: 101 });

      expect(ost.pushTimeRecordUpdate).toHaveBeenCalledWith({ bibId: 101 }, false, { force: true });
    });

    it("rejects a non-numeric bib", async () => {
      await expect(
        handlerFor("opensplittime-push-record")(undefined, { bibId: "101" })
      ).rejects.toThrow("bibId must be a number");
    });

    it("rejects a bib with no timing record", async () => {
      getTimeRecordbyBib.mockReturnValue([null, DatabaseStatus.NotFound, ""]);

      await expect(
        handlerFor("opensplittime-push-record")(undefined, { bibId: 999 })
      ).rejects.toThrow("No timing record found for bib 999");
    });
  });
});
