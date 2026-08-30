/*
    Rest Client for the RFID reader. Made to work with the Zebra FXR90
    A raspberry Pi version is in the works.
*/

import https from "node:https";
import type { PeerCertificate, TLSSocket } from "node:tls";
import { RfidSettings } from "$shared/models";
import { LogLevel, logRFID } from "../rfid-log";

type HttpMethod = "GET" | "PUT";

// Zebra FXR90 units ship with a self-signed cert, so the normal CA chain
// can't be validated. Instead, pin the leaf cert's serial number or CN
// (settings.sslCert) and reject anything that doesn't match.
function normalizePin(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isTrustedCert(cert: PeerCertificate | undefined, pin: string): boolean {
  if (!cert || !pin) return false;
  const normalizedPin = normalizePin(pin);
  return (
    normalizePin(cert.serialNumber ?? "") === normalizedPin ||
    normalizePin(cert.subject?.CN ?? "") === normalizedPin
  );
}

function requestJson(
  url: string,
  method: HttpMethod,
  headers: Record<string, string>,
  certPin: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; statusText: string; text: string; json: () => unknown }> {
  return new Promise((resolve, reject) => {
    if (!certPin) {
      reject(new Error("RFID certificate pin (sslCert) is not configured."));
      return;
    }

    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      url,
      {
        method,
        headers: payload
          ? { ...headers, "Content-Length": Buffer.byteLength(payload) }
          : headers,
        rejectUnauthorized: false
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: res.statusMessage ?? "",
            text,
            json: () => (text ? JSON.parse(text) : undefined)
          });
        });
      }
    );

    req.on("socket", (socket: TLSSocket) => {
      socket.once("secureConnect", () => {
        const presentedCert = socket.getPeerCertificate();
        if (!isTrustedCert(presentedCert, certPin)) {
          req.destroy(
            new Error(
              `RFID reader certificate did not match pinned cert "${certPin}" ` +
                `(reader presented serial="${presentedCert?.serialNumber}" cn="${presentedCert?.subject?.CN}")`
            )
          );
        }
      });
    });

    req.on("error", (error: NodeJS.ErrnoException) => {
      reject(describeNetworkError(url, error));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

// Turn Node's low-level connection errors into a message an operator can act on.
function describeNetworkError(url: string, error: NodeJS.ErrnoException): Error {
  const host = new URL(url).host;
  switch (error.code) {
    case "ENOTFOUND":
      return new Error(`Could not resolve RFID reader host "${host}". Check the network/hostname.`);
    case "ECONNREFUSED":
      return new Error(`RFID reader at "${host}" refused the connection. Is it powered on and reachable?`);
    case "ETIMEDOUT":
    case "ECONNRESET":
      return new Error(`Connection to RFID reader at "${host}" timed out or was reset.`);
    case "EHOSTUNREACH":
      return new Error(`RFID reader at "${host}" is unreachable on the network.`);
    default:
      return error;
  }
}


export class RfidRestClient {
  private settings: RfidSettings;
  private token: string | undefined;
  private lastError: string | undefined;

  constructor(settings: RfidSettings) {
    this.settings = settings;
  }

  getLastError(): string | undefined {
    return this.lastError;
  }

  // Login method to fetch the token
  async login(): Promise<boolean> {
    if (!this.settings.userName || !this.settings.password) {
      this.lastError = "RFID username/password is not configured.";
      return false;
    }

    const credentials = `${this.settings.userName}:${this.settings.password}`;
    const base64Credentials = Buffer.from(credentials).toString("base64");
    const url = `https://${this.settings.restApiUrl}/cloud/localRestLogin`;
    try {
      const response = await requestJson(
        url,
        "GET",
        {
          accept: "application/json",
          Authorization: `Basic ${base64Credentials}`
        },
        this.settings.sslCert
      );

      if (!response.ok) {
        const reason =
          response.status === 401 || response.status === 403
            ? "invalid username or password"
            : response.text || response.statusText;
        this.lastError = `Login failed: ${response.status} ${response.statusText} (${reason})`;
        return false;
      }

      const data = response.json() as { message?: string };
      if (!data?.message) {
        this.lastError = `Login response did not include a token: ${response.text}`;
        return false;
      }

      this.token = data.message; // Save the token
      logRFID(LogLevel.info, "RFID REST login successful!");
      this.lastError = undefined;
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  // Helper to make authenticated requests
  private async request(
    method: HttpMethod,
    endpoint: string,
    body: object | null = null
  ): Promise<unknown> {
    if (!this.token) {
      throw new Error("Not authenticated! Please log in first.");
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json"
    };

    const url = `https://${this.settings.restApiUrl}${endpoint}`;
    const response = await requestJson(url, method, headers, this.settings.sslCert, body ?? undefined);

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status} ${response.statusText} (${response.text || "no body"})`
      );
    }

    return response.json();
  }


  // API Methods
  async stop(): Promise<void> {
    try {
      await this.request("PUT", "/cloud/stop");
      logRFID(LogLevel.info, "RFID stop command sent.");
    } catch (error) {
      logRFID(LogLevel.error, "Failed to stop RFID:", error);
    }
  }

  async start(): Promise<void> {
    try {
      await this.request("PUT", "/cloud/start");
      logRFID(LogLevel.info, "RFID start command sent.");
    } catch (error) {
      logRFID(LogLevel.error, "Failed to start RFID:", error);
    }
  }

  async getMode(): Promise<unknown> {
    try {
      const data = await this.request("GET", "/cloud/mode");
      logRFID(LogLevel.debug, "Current RFID mode:", data);
      return data;
    } catch (error) {
      logRFID(LogLevel.error, "Failed to get RFID mode:", error);
      return null;
    }
  }

  async setMode(mode: string): Promise<void> {
    try {
      const parseData: unknown = JSON.parse(mode);

      if (typeof parseData === "object" && parseData !== null) {
        await this.request("PUT", "/cloud/mode", parseData);
      }
      logRFID(LogLevel.info, "RFID mode updated.");
    } catch (error) {
      logRFID(LogLevel.error, "Failed to set RFID mode:", error);
    }
  }
}
