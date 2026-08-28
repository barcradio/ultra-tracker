import { format } from "date-fns";
import { config } from "dotenv";
import { safeStorage } from "electron";
import { RunnerDB } from "$shared/models";
import * as opensplittimeStatusDb from "../database/opensplittimeStatus-db";
import { appStore } from "../lib/store";

config({ path: "opensplittime.env" });

const apiHosts = {
  staging: "https://staging.opensplittime.org",
  production: "https://www.opensplittime.org"
} as const;
const organizationIds = {
  staging: "the-bear-100",
  production: ""
} as const;
export type OpenSplitTimeEnvironment = "production" | "staging";
const apiTokens = {
  staging: process.env.OPENSPLITTIME_STAGING_API_KEY,
  production: process.env.OPENSPLITTIME_API_KEY
} as const;
const requestTimeoutMs = 30_000;

export type OpenSplitTimeConnectionStatus = "connected" | "disconnected";

export interface OpenSplitTimeConnectionResult {
  internet: OpenSplitTimeConnectionStatus;
  openSplitTime: OpenSplitTimeConnectionStatus;
}

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

interface OpenSplitTimeEventMetadata {
  name: string;
  id: number;
}

interface OpenSplitTimeEventMetadataStore {
  production?: OpenSplitTimeEventMetadata;
  staging?: OpenSplitTimeEventMetadata;
}

interface OpenSplitTimeEventGroupResponse {
  data?: { id?: string | number };
}

export interface OpenSplitTimeEnvironmentOption {
  environment: OpenSplitTimeEnvironment;
  name: string;
}

// The stations JSON file may only configure one of production/staging, so
// prefer staging and fall back to whichever environment is actually configured.
function computeDefaultEnvironment(): OpenSplitTimeEnvironment {
  const eventMetadata = appStore.get("event.openSplitTime") as
    | OpenSplitTimeEventMetadataStore
    | undefined;

  if (eventMetadata?.staging?.name) return "staging";
  if (eventMetadata?.production?.name) return "production";

  return process.env.OPENSPLITTIME_ENV === "production" ? "production" : "staging";
}

let currentEnvironment: OpenSplitTimeEnvironment = computeDefaultEnvironment();
let apiToken: string | null = apiTokens[currentEnvironment]?.trim() || null;
// Tracks the active token's expiration so the UI can restore its signed-in state after remounting.
let tokenExpiration: string | null = null;
// Pushes are paused by default so an operator must explicitly resume them after signing in.
let pushPaused = true;

export interface OpenSplitTimeAuthStatus {
  authenticated: boolean;
  expiration: string | null;
}

export function getAuthStatus(): OpenSplitTimeAuthStatus {
  return { authenticated: apiToken !== null, expiration: tokenExpiration };
}

export function getOpenSplitTimeEnvironment(): OpenSplitTimeEnvironment {
  return currentEnvironment;
}

export function isOpenSplitTimePushPaused(): boolean {
  return pushPaused;
}

export function setOpenSplitTimePushPaused(paused: boolean): void {
  requireToken();
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
    | OpenSplitTimeEventMetadataStore
    | undefined;
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
  apiToken = apiTokens[environment]?.trim() || null;
  tokenExpiration = null;
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
    console.debug(`OpenSplitTime request: ${init.method ?? "GET"} ${url}`);

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
      const detail = typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
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
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

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
  pushPaused = true;

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

// The stations JSON file records the OpenSplitTime event group id manually, so
// verify it against the live event group and correct it if OpenSplitTime disagrees.
export async function syncEventGroupId(): Promise<void> {
  const eventMetadata = appStore.get("event.openSplitTime") as
    | OpenSplitTimeEventMetadataStore
    | undefined;
  const configuredEvent =
    currentEnvironment === "production" ? eventMetadata?.production : eventMetadata?.staging;
  const eventGroupIdOrSlug = configuredEvent?.name || (appStore.get("event.name") as string);

  if (!eventGroupIdOrSlug) return;

  try {
    const response = (await getEventGroup(eventGroupIdOrSlug)) as OpenSplitTimeEventGroupResponse;
    const remoteId = Number(response?.data?.id);

    if (!Number.isFinite(remoteId) || remoteId <= 0 || remoteId === configuredEvent?.id) return;

    appStore.set("event.openSplitTime", {
      ...eventMetadata,
      [currentEnvironment]: { name: eventGroupIdOrSlug, id: remoteId }
    });
    console.info(`OpenSplitTime event group id for "${eventGroupIdOrSlug}" updated to ${remoteId}`);
  } catch (error) {
    console.warn("Unable to verify OpenSplitTime event group id", error);
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

export async function getOrganization(
  organizationIdOrSlug = organizationIds[currentEnvironment]
): Promise<unknown> {
  if (organizationIdOrSlug === "") {
    throw new OpenSplitTimeApiError("No OpenSplitTime organization is configured", 500);
  }

  return request(`/organizations/${encodeURIComponent(organizationIdOrSlug)}`, {
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
}

interface OpenSplitTimePushConfig {
  eventGroupIdOrSlug: string;
  stationIdentifier: string;
  splitName: string;
}

function resolvePushConfig(): OpenSplitTimePushConfig {
  const eventMetadata = appStore.get("event.openSplitTime") as
    | OpenSplitTimeEventMetadataStore
    | undefined;
  const configuredEvent =
    currentEnvironment === "production" ? eventMetadata?.production : eventMetadata?.staging;
  const eventGroupIdOrSlug = configuredEvent?.name || (appStore.get("event.name") as string);
  const stationIdentifier = appStore.get("station.identifier") as string;
  const stationName = appStore.get("station.name") as string;
  // The OST split name must match a split already configured on the event group; use the
  // stations-file override when the station name itself doesn't line up with OST's naming.
  const splitName = (appStore.get("station.openSplitTimeSplitName") as string) || stationName;

  if (!eventGroupIdOrSlug || !stationIdentifier || !stationName) {
    throw new OpenSplitTimeApiError("OpenSplitTime event or station is not configured", 500);
  }

  return { eventGroupIdOrSlug, stationIdentifier, splitName };
}

function buildRawTimeRecords(
  record: RunnerDB,
  config: OpenSplitTimePushConfig,
  stoppedHere?: boolean
): OpenSplitTimeRawTime[] {
  const records: OpenSplitTimeRawTime[] = [];
  const stoppedHereValue =
    stoppedHere == null ? undefined : (String(stoppedHere) as "true" | "false");

  const addRecord = (time: Date | null, kind: "in" | "out") => {
    if (!time) return;

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
}

// Logs the rejected payload alongside the error so a server-side 500 can be diagnosed against the OST
// event group's configured source/split names without having to reproduce the push.
function recordPushFailure(
  bibId: number,
  eventGroupIdOrSlug: string,
  records: OpenSplitTimeRawTime[],
  error: unknown
): void {
  opensplittimeStatusDb.setPushStatus(
    bibId,
    "error",
    error instanceof Error ? error.message : String(error)
  );
  console.error(
    `OpenSplitTime push failed for bib ${bibId} (event group "${eventGroupIdOrSlug}", environment ${currentEnvironment})`,
    records,
    error
  );
}

export async function pushTimeRecordUpdate(
  record: RunnerDB,
  stoppedHere?: boolean,
  options: { force?: boolean } = {}
): Promise<OpenSplitTimePushOutcome> {
  if (pushPaused && !options.force) {
    console.info(`OpenSplitTime push skipped for bib ${record.bibId}: pushes are paused`);
    return { pushed: false };
  }

  const config = resolvePushConfig();
  const records = buildRawTimeRecords(record, config, stoppedHere);

  if (records.length === 0) return { pushed: false };

  console.info(
    `OpenSplitTime push starting for bib ${record.bibId}: ${records.length} raw time(s) to ${currentEnvironment}`
  );

  try {
    const result = await submitRawTimes(config.eventGroupIdOrSlug, records);
    recordPushSuccess(record.bibId);
    return { pushed: true, result };
  } catch (error) {
    recordPushFailure(record.bibId, config.eventGroupIdOrSlug, records, error);
    throw error;
  }
}
