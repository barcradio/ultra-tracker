import { format } from "date-fns";
import { config } from "dotenv";
import { safeStorage } from "electron";
import { RunnerDB } from "$shared/models";
import * as opensplittimeStatusDb from "../database/opensplittimeStatus-db";
import { emitConnectionStatus } from "../ipc/connectivity-emitter";
import { emitRunnersTableChanged } from "../ipc/runner-data-emitter";
import { sendToastToRenderer } from "../ipc/toast-ipc";
import { appStore } from "../lib/store";

config({ path: "opensplittime.env" });

const apiHosts = {
  staging: "https://staging.opensplittime.org",
  production: "https://www.opensplittime.org"
} as const;
export type OpenSplitTimeEnvironment = "production" | "staging";
const requestTimeoutMs = 30_000;
// Probes use a much shorter timeout than authenticated API calls so a dead link is detected quickly.
const probeTimeoutMs = 5_000;
const connectivityPollIntervalMs = 15_000;

export type OpenSplitTimeConnectionStatus = "connected" | "disconnected";

export interface OpenSplitTimeConnectionResult {
  internet: OpenSplitTimeConnectionStatus;
  openSplitTime: OpenSplitTimeConnectionStatus;
}

export interface OpenSplitTimeConnectionState extends OpenSplitTimeConnectionResult {
  checking: boolean;
}

let cachedConnectionStatus: OpenSplitTimeConnectionState = {
  internet: "disconnected",
  openSplitTime: "disconnected",
  checking: false
};
let connectivityCheckInFlight = false;
let monitorStarted = false;

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface OpenSplitTimeAuthResult {
  expiration: string;
  credentialsSaved: boolean;
}

export interface OpenSplitTimeSavedCredentials {
  email: string;
  available: boolean;
}

export interface OpenSplitTimeRawTime {
  source: string;
  sub_split_kind: "in" | "out";
  with_pacer?: "true" | "false";
  entered_time: string;
  split_name: string;
  bib_number: string;
  stopped_here?: "true" | "false";
}

interface OpenSplitTimeAuthResponse {
  token?: string;
  expiration?: string;
}

type OpenSplitTimeSubSplitKind = "in" | "out";

interface OpenSplitTimeEventMetadata {
  name: string;
  id: number;
  splitEntryKinds?: Record<string, OpenSplitTimeSubSplitKind[]>;
}

interface OpenSplitTimeEventMetadataStore {
  production?: OpenSplitTimeEventMetadata;
  staging?: OpenSplitTimeEventMetadata;
  splitNames?: Record<string, string>;
}

interface OpenSplitTimeEventGroupResponse {
  data?: {
    id?: string | number;
    attributes?: {
      id?: string | number;
      dataEntryGroups?: Array<{
        entries?: Array<{
          splitName?: string;
          subSplitKind?: string;
        }>;
      }>;
      unpairedDataEntryGroups?: Array<{
        entries?: Array<{
          splitName?: string;
          subSplitKind?: string;
        }>;
      }>;
    };
  };
}

export interface OpenSplitTimeEnvironmentOption {
  environment: OpenSplitTimeEnvironment;
  name: string;
}

// The stations JSON file may only configure one of production/staging, so
// prefer staging and fall back to whichever environment is actually configured.
function computeDefaultEnvironment(): OpenSplitTimeEnvironment {
  const eventMetadata = appStore.get("event.openSplitTime") as
    OpenSplitTimeEventMetadataStore | undefined;

  if (eventMetadata?.staging?.name) return "staging";
  if (eventMetadata?.production?.name) return "production";

  return process.env.OPENSPLITTIME_ENV === "production" ? "production" : "staging";
}

let currentEnvironment: OpenSplitTimeEnvironment = computeDefaultEnvironment();
let apiToken: string | null = null;
// Tracks the active token's expiration so the UI can restore its signed-in state after remounting.
let tokenExpiration: string | null = null;
// Paused until a real sign-in sets tokenExpiration.
let pushPaused = true;

export interface OpenSplitTimeAuthStatus {
  authenticated: boolean;
  expiration: string | null;
}

export function getAuthStatus(): OpenSplitTimeAuthStatus {
  return {
    authenticated: apiToken !== null && tokenExpiration !== null,
    expiration: tokenExpiration
  };
}

export function getOpenSplitTimeEnvironment(): OpenSplitTimeEnvironment {
  return currentEnvironment;
}

export function isOpenSplitTimePushPaused(): boolean {
  return pushPaused;
}

// The stations file must supply an OST event group for the active environment before pushes
// may run; otherwise every push would fail against a nonexistent or wrong event group.
export function isOpenSplitTimeEventGroupConfigured(): boolean {
  const eventMetadata = appStore.get("event.openSplitTime") as
    OpenSplitTimeEventMetadataStore | undefined;
  const configuredEvent =
    currentEnvironment === "production" ? eventMetadata?.production : eventMetadata?.staging;

  return Boolean(configuredEvent?.name);
}

export function setOpenSplitTimePushPaused(paused: boolean): void {
  requireToken();

  if (!paused && !isOpenSplitTimeEventGroupConfigured()) {
    throw new OpenSplitTimeApiError(
      `OpenSplitTime event group is not configured for the ${currentEnvironment} environment`,
      500
    );
  }

  pushPaused = paused;
}

export type OpenSplitTimePushStatus = "success" | "error";

export interface OpenSplitTimePushState {
  status: OpenSplitTimePushStatus;
  error?: string;
}

// Persisted in the OpenSplitTimePushStatus table so the outcome of the most recent push per bib
// survives app restarts and is visible from any station using the shared database.
export function getOpenSplitTimePushStatus(bibId: number): OpenSplitTimePushState | undefined {
  const record = opensplittimeStatusDb.getPushStatus(bibId);
  if (!record) return undefined;

  return { status: record.status, error: record.error ?? undefined };
}

export function listOpenSplitTimeEnvironments(): OpenSplitTimeEnvironmentOption[] {
  const eventMetadata = appStore.get("event.openSplitTime") as
    OpenSplitTimeEventMetadataStore | undefined;
  const options: OpenSplitTimeEnvironmentOption[] = [];

  if (eventMetadata?.staging?.name) {
    options.push({ environment: "staging", name: eventMetadata.staging.name });
  }
  if (eventMetadata?.production?.name) {
    options.push({ environment: "production", name: eventMetadata.production.name });
  }

  return options;
}

export function setOpenSplitTimeEnvironment(environment: OpenSplitTimeEnvironment): void {
  if (environment === currentEnvironment) return;

  currentEnvironment = environment;
  apiToken = null;
  tokenExpiration = null;
  pushPaused = true;
}

export class OpenSplitTimeApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenSplitTimeApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const url = `${apiHosts[currentEnvironment]}/api/v1${path}`;

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers
      },
      signal: controller.signal
    });
    const responseText = await response.text();
    let responseBody: unknown;

    try {
      responseBody = responseText ? JSON.parse(responseText) : undefined;
    } catch {
      responseBody = responseText;
    }

    if (!response.ok) {
      const detail =
        typeof responseBody === "string"
          ? responseBody
          : ((responseBody as { error?: string; message?: string })?.error ??
            (responseBody as { message?: string })?.message ??
            JSON.stringify(responseBody));

      // A 401 means the server has rejected the token outright, so clear it instead of leaving
      // the app believing it's still authenticated until the next manual auth check.
      if (response.status === 401) {
        apiToken = null;
        tokenExpiration = null;
        pushPaused = true;
      }

      throw new OpenSplitTimeApiError(
        `OpenSplitTime API request failed: ${detail}`,
        response.status
      );
    }

    return responseBody as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function probe(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), probeTimeoutMs);

  try {
    const response = await fetch(url, { method: "HEAD", signal: controller.signal });
    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getConnectionStatus(): Promise<OpenSplitTimeConnectionResult> {
  const [internet, openSplitTime] = await Promise.all([
    probe("https://www.google.com/generate_204"),
    probe(apiHosts[currentEnvironment])
  ]);

  return {
    internet: internet ? "connected" : "disconnected",
    openSplitTime: openSplitTime ? "connected" : "disconnected"
  };
}

// Returns the last known status instantly, without waiting on a network probe.
export function getCachedConnectionStatus(): OpenSplitTimeConnectionState {
  return cachedConnectionStatus;
}

async function runConnectivityCheck(): Promise<void> {
  if (connectivityCheckInFlight) return;

  connectivityCheckInFlight = true;
  cachedConnectionStatus = { ...cachedConnectionStatus, checking: true };
  emitConnectionStatus(cachedConnectionStatus);

  try {
    const result = await getConnectionStatus();
    cachedConnectionStatus = { ...result, checking: false };
  } finally {
    connectivityCheckInFlight = false;
    emitConnectionStatus(cachedConnectionStatus);
  }
}

// Starts the background connectivity poll once at app boot; safe to call more than once.
export function startConnectivityMonitor(): void {
  if (monitorStarted) return;
  monitorStarted = true;

  void runConnectivityCheck();
  setInterval(() => void runConnectivityCheck(), connectivityPollIntervalMs);
}

// Triggers an out-of-cycle probe, used when the renderer detects an OS-level network change.
export async function forceConnectivityRecheck(): Promise<OpenSplitTimeConnectionState> {
  await runConnectivityCheck();
  return cachedConnectionStatus;
}

function requireToken(): string {
  if (apiToken === null) {
    throw new OpenSplitTimeApiError("OpenSplitTime authentication is required", 401);
  }

  return apiToken;
}

export async function authenticate(
  email: string,
  password: string,
  saveCredentials = false
): Promise<OpenSplitTimeAuthResult> {
  apiToken = null;

  const response = await request<OpenSplitTimeAuthResponse>("/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      "user[email]": email,
      "user[password]": password
    }).toString()
  });

  if (!response.token || !response.expiration) {
    throw new OpenSplitTimeApiError(
      "OpenSplitTime returned an incomplete authentication response",
      502
    );
  }

  apiToken = response.token;
  tokenExpiration = response.expiration;
  // Sign-in is always allowed, but pushes stay paused until an event group is configured.
  pushPaused = !isOpenSplitTimeEventGroupConfigured();

  if (saveCredentials && safeStorage.isEncryptionAvailable()) {
    appStore.set("openSplitTime.email", email);
    appStore.set(
      "openSplitTime.encryptedPassword",
      safeStorage.encryptString(password).toString("base64")
    );
  } else if (!saveCredentials) {
    clearSavedCredentials();
  }

  await syncEventGroupId();

  return {
    expiration: response.expiration,
    credentialsSaved: saveCredentials && safeStorage.isEncryptionAvailable()
  };
}

function normalizeSplitEntryKinds(rawValue: unknown): OpenSplitTimeSubSplitKind[] {
  if (typeof rawValue !== "string") return [];

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "in") return ["in"];
  if (normalized === "out") return ["out"];
  if (normalized === "inout") return ["in", "out"];

  return [];
}

function deriveSplitEntryKindsFromResponse(
  response: OpenSplitTimeEventGroupResponse | unknown
): Record<string, OpenSplitTimeSubSplitKind[]> {
  const groups =
    (response as OpenSplitTimeEventGroupResponse | undefined)?.data?.attributes?.dataEntryGroups ??
    (response as OpenSplitTimeEventGroupResponse | undefined)?.data?.attributes
      ?.unpairedDataEntryGroups ??
    [];
  const splitEntryKinds: Record<string, OpenSplitTimeSubSplitKind[]> = {};

  for (const group of groups) {
    const entries = group?.entries ?? [];

    for (const entry of entries) {
      const splitName = entry?.splitName?.trim();
      const subSplitKind = normalizeSplitEntryKinds(entry?.subSplitKind);

      if (!splitName || subSplitKind.length === 0) continue;

      const existingKinds = splitEntryKinds[splitName] ?? [];
      const mergedKinds = [...new Set([...existingKinds, ...subSplitKind])];
      splitEntryKinds[splitName] = mergedKinds;
    }
  }

  return splitEntryKinds;
}

// The stations JSON file records the OpenSplitTime event group id manually, so
// verify it against the live event group and correct it if OpenSplitTime disagrees.
export async function syncEventGroupId(): Promise<void> {
  const eventMetadata = appStore.get("event.openSplitTime") as
    OpenSplitTimeEventMetadataStore | undefined;
  const configuredEvent =
    currentEnvironment === "production" ? eventMetadata?.production : eventMetadata?.staging;
  const eventGroupIdOrSlug = configuredEvent?.name;

  if (!eventGroupIdOrSlug) return;

  try {
    const response = (await getEventGroup(eventGroupIdOrSlug)) as OpenSplitTimeEventGroupResponse;
    const remoteId = Number(response?.data?.id ?? response?.data?.attributes?.id);
    const splitEntryKinds = deriveSplitEntryKindsFromResponse(response);

    const nextEventMetadata = {
      ...eventMetadata,
      [currentEnvironment]: {
        name: eventGroupIdOrSlug,
        id: Number.isFinite(remoteId) && remoteId > 0 ? remoteId : (configuredEvent?.id ?? 0),
        splitEntryKinds: Object.keys(splitEntryKinds).length > 0 ? splitEntryKinds : undefined
      }
    };

    appStore.set("event.openSplitTime", nextEventMetadata);

    if (Number.isFinite(remoteId) && remoteId > 0 && remoteId !== configuredEvent?.id) {
      console.info(
        `OpenSplitTime event group id for "${eventGroupIdOrSlug}" updated to ${remoteId}`
      );
    }
  } catch (error) {
    console.warn("Unable to verify OpenSplitTime event group id", error);
  }
}

export async function syncSplitEntryKinds(): Promise<void> {
  const eventMetadata = appStore.get("event.openSplitTime") as
    OpenSplitTimeEventMetadataStore | undefined;
  const configuredEvent =
    currentEnvironment === "production" ? eventMetadata?.production : eventMetadata?.staging;
  const eventGroupIdOrSlug = configuredEvent?.name;

  if (!eventGroupIdOrSlug) return;

  try {
    const response = (await getEventGroup(eventGroupIdOrSlug)) as OpenSplitTimeEventGroupResponse;
    const splitEntryKinds = deriveSplitEntryKindsFromResponse(response);
    const currentEventMetadata = appStore.get("event.openSplitTime") as
      OpenSplitTimeEventMetadataStore | undefined;
    const nextEvent = {
      ...currentEventMetadata,
      [currentEnvironment]: {
        ...(currentEnvironment === "production"
          ? currentEventMetadata?.production
          : currentEventMetadata?.staging),
        name: eventGroupIdOrSlug,
        id: configuredEvent?.id ?? 0,
        splitEntryKinds: Object.keys(splitEntryKinds).length > 0 ? splitEntryKinds : {}
      }
    };

    appStore.set("event.openSplitTime", nextEvent);
  } catch (error) {
    console.warn("Unable to sync OpenSplitTime split entry kinds", error);
  }
}

export function getSavedCredentials(): OpenSplitTimeSavedCredentials {
  const email = appStore.get("openSplitTime.email") as string;
  const encryptedPassword = appStore.get("openSplitTime.encryptedPassword") as string;

  return { email, available: email !== "" && encryptedPassword !== "" };
}

export async function authenticateSaved(): Promise<OpenSplitTimeAuthResult> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new OpenSplitTimeApiError("Saved OpenSplitTime credentials are unavailable", 401);
  }

  const savedCredentials = getSavedCredentials();
  if (!savedCredentials.available) {
    throw new OpenSplitTimeApiError("Saved OpenSplitTime credentials are unavailable", 401);
  }

  const encryptedPassword = appStore.get("openSplitTime.encryptedPassword") as string;
  const password = safeStorage.decryptString(Buffer.from(encryptedPassword, "base64"));
  return authenticate(savedCredentials.email, password, true);
}

export function clearSavedCredentials(): void {
  appStore.set("openSplitTime.email", "");
  appStore.set("openSplitTime.encryptedPassword", "");
}

export function clearAuthentication(): void {
  apiToken = null;
  tokenExpiration = null;
  pushPaused = true;
}

export async function getEventGroup(eventGroupIdOrSlug: string): Promise<unknown> {
  return request(`/event_groups/${encodeURIComponent(eventGroupIdOrSlug)}`, {
    headers: { Authorization: `Bearer ${requireToken()}` }
  });
}

export async function submitRawTimes(
  eventGroupIdOrSlug: string,
  records: OpenSplitTimeRawTime[]
): Promise<unknown> {
  return request(`/event_groups/${encodeURIComponent(eventGroupIdOrSlug)}/import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: records.map((attributes) => ({ type: "raw_time", attributes })),
      data_format: "jsonapi_batch", // eslint-disable-line camelcase
      limited_response: "true" // eslint-disable-line camelcase
    })
  });
}

export interface OpenSplitTimePushOutcome {
  pushed: boolean;
  result?: unknown;
  error?: string;
}

interface OpenSplitTimePushConfig {
  eventGroupIdOrSlug: string;
  stationIdentifier: string;
  splitName: string;
  allowedKinds: OpenSplitTimeSubSplitKind[];
}

function resolveAllowedKindsForSplit(splitName: string): OpenSplitTimeSubSplitKind[] {
  const eventMetadata = appStore.get("event.openSplitTime") as
    OpenSplitTimeEventMetadataStore | undefined;
  const configuredEvent =
    currentEnvironment === "production" ? eventMetadata?.production : eventMetadata?.staging;
  const liveKinds = configuredEvent?.splitEntryKinds?.[splitName];

  if (Array.isArray(liveKinds) && liveKinds.length > 0) {
    return [...new Set(liveKinds)];
  }

  const entryMode = Number(appStore.get("station.entrymode") ?? 0);
  if (entryMode === 2) return ["in"];
  if (entryMode === 3) return ["out"];

  return ["in", "out"];
}

function resolvePushConfig(): OpenSplitTimePushConfig {
  const eventMetadata = appStore.get("event.openSplitTime") as
    OpenSplitTimeEventMetadataStore | undefined;
  const configuredEvent =
    currentEnvironment === "production" ? eventMetadata?.production : eventMetadata?.staging;
  const eventGroupIdOrSlug = configuredEvent?.name;
  const stationIdentifier = appStore.get("station.identifier") as string;
  const stationName = appStore.get("station.name") as string;
  // The OST split name must match a split already configured on the event group; use the
  // stations-file override when the station name itself doesn't line up with OST's naming.
  const splitName = (appStore.get("station.openSplitTimeSplitName") as string) || stationName;

  if (!eventGroupIdOrSlug) {
    throw new OpenSplitTimeApiError(
      `OpenSplitTime event group is not configured for the ${currentEnvironment} environment; reload the stations file`,
      500
    );
  }
  if (!stationIdentifier || !stationName) {
    throw new OpenSplitTimeApiError("OpenSplitTime event or station is not configured", 500);
  }

  const allowedKinds = resolveAllowedKindsForSplit(splitName);

  return { eventGroupIdOrSlug, stationIdentifier, splitName, allowedKinds };
}

function buildRawTimeRecords(
  record: RunnerDB,
  config: OpenSplitTimePushConfig,
  stoppedHere?: boolean
): OpenSplitTimeRawTime[] {
  const records: OpenSplitTimeRawTime[] = [];
  const stoppedHereValue =
    stoppedHere == null ? undefined : (String(stoppedHere) as "true" | "false");
  const allowedKinds = new Set(config.allowedKinds);

  const addRecord = (time: Date | null, kind: OpenSplitTimeSubSplitKind) => {
    if (!time || !allowedKinds.has(kind)) return;

    records.push({
      source: config.stationIdentifier,
      ["sub_split_kind"]: kind,
      ["with_pacer"]: "false",
      ["entered_time"]: format(time, "yyyy-MM-dd HH:mm:ssxxx"),
      ["split_name"]: config.splitName,
      ["bib_number"]: String(Math.floor(record.bibId)),
      ["stopped_here"]: stoppedHereValue
    });
  };

  addRecord(record.timeIn, "in");
  addRecord(record.timeOut, "out");

  return records;
}

function recordPushSuccess(bibId: number): void {
  opensplittimeStatusDb.setPushStatus(bibId, "success");
  console.info(`OpenSplitTime push succeeded for bib ${bibId}`);
  emitRunnersTableChanged();
}

// Logs the rejected payload alongside the error so a server-side 500 can be diagnosed against the OST
// event group's configured source/split names without having to reproduce the push.
function recordPushFailure(
  bibId: number,
  eventGroupIdOrSlug: string,
  records: OpenSplitTimeRawTime[],
  error: unknown
): string {
  const message = error instanceof Error ? error.message : String(error);

  opensplittimeStatusDb.setPushStatus(bibId, "error", message);
  console.error(
    `OpenSplitTime push failed for bib ${bibId} (event group "${eventGroupIdOrSlug}", environment ${currentEnvironment})`,
    records,
    error
  );
  // Surfaced regardless of whether the push was triggered manually or automatically in the
  // background, since background failures otherwise only ever reach the console.
  sendToastToRenderer({
    message: `Runner #${bibId} push failed: ${message}`,
    type: "warning",
    timeoutMs: -1
  });
  emitRunnersTableChanged();

  return message;
}

export async function pushTimeRecordUpdate(
  record: RunnerDB,
  stoppedHere?: boolean,
  options: { force?: boolean } = {}
): Promise<OpenSplitTimePushOutcome> {
  if (pushPaused && !options.force) {
    return { pushed: false };
  }

  const config = resolvePushConfig();
  const records = buildRawTimeRecords(record, config, stoppedHere);

  if (records.length === 0) return { pushed: false };

  console.info(
    `OpenSplitTime push session: env=${currentEnvironment} split=${config.splitName} bib=${record.bibId} kinds=${config.allowedKinds.join(",") || "none"} records=${records.length}`
  );

  try {
    const result = await submitRawTimes(config.eventGroupIdOrSlug, records);
    recordPushSuccess(record.bibId);
    return { pushed: true, result };
  } catch (error) {
    const message = recordPushFailure(record.bibId, config.eventGroupIdOrSlug, records, error);
    return { pushed: false, error: message };
  }
}
