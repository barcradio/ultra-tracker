import { config } from "dotenv";
import { safeStorage } from "electron";
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
const openSplitTimeEnvironment =
  process.env.OPENSPLITTIME_ENV === "production" ? "production" : "staging";
const apiBaseUrl = `${apiHosts[openSplitTimeEnvironment]}/api/v1`;
export const openSplitTimeOrganizationId = organizationIds[openSplitTimeEnvironment];
const apiTokens = {
  staging: process.env.OPENSPLITTIME_STAGING_API_KEY,
  production: process.env.OPENSPLITTIME_API_KEY
} as const;
const requestTimeoutMs = 10_000;

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

let apiToken: string | null = apiTokens[openSplitTimeEnvironment]?.trim() || null;

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

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
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
    probe(apiHosts[openSplitTimeEnvironment])
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

  if (saveCredentials && safeStorage.isEncryptionAvailable()) {
    appStore.set("openSplitTime.email", email);
    appStore.set(
      "openSplitTime.encryptedPassword",
      safeStorage.encryptString(password).toString("base64")
    );
  } else if (!saveCredentials) {
    clearSavedCredentials();
  }

  return {
    expiration: response.expiration,
    credentialsSaved: saveCredentials && safeStorage.isEncryptionAvailable()
  };
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
}

export async function getEventGroup(eventGroupIdOrSlug: string): Promise<unknown> {
  return request(`/event_groups/${encodeURIComponent(eventGroupIdOrSlug)}`, {
    headers: { Authorization: `Bearer ${requireToken()}` }
  });
}

export async function getOrganization(
  organizationIdOrSlug = openSplitTimeOrganizationId
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
