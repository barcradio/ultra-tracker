/*
    Rest Client for the RFID reader. Made to work with the Zebra FXR90
    A raspberry Pi version is in the works.
*/

import { RfidSettings } from "$shared/models";

export class RfidRestClient {
  private settings: RfidSettings;
  private token: string | undefined;
  private lastError: string | undefined;

  constructor(settings: RfidSettings) {
    this.settings = settings;
  }

  // Login method to fetch the token
  async login(): Promise<boolean> {
    const credentials = `${this.settings.userName}:${this.settings.password}`;
    const base64Credentials = Buffer.from(credentials).toString("base64");
    const url = `https://${this.settings.restApiUrl}/cloud/localRestLogin`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Basic ${base64Credentials}`
        }
      });

      if (!response.ok) {
        this.lastError = `Login failed: ${response.status} ${response.statusText}`;
        console.warn(this.lastError);
        return false;
      }

      const data = await response.json();
      this.token = data.message; // Save the token
      console.log("RFID REST login successful!");
      this.lastError = undefined;
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message + " " + error.cause : String(error);
      console.warn("Error during RFID REST login:", this.lastError);
      return false;
    }
  }

  // Helper to make authenticated requests
  private async request(method: "GET" | "PUT", endpoint: string, body: object | null = null) {
    if (!this.token) {
      throw new Error("Not authenticated! Please log in first.");
    }

    const headers: HeadersInit = {
      Accept: "application/json",
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json"
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.settings.restApiUrl}${endpoint}`, options);

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // API Methods
  async stop(): Promise<void> {
    try {
      await this.request("PUT", "/cloud/stop");
      console.log("RFID stop command sent.");
    } catch (error) {
      console.error("Failed to stop RFID:", error);
    }
  }

  async start(): Promise<void> {
    try {
      await this.request("PUT", "/cloud/start");
      console.log("RFID start command sent.");
    } catch (error) {
      console.error("Failed to start RFID:", error);
    }
  }

  async getMode(): Promise<unknown> {
    try {
      const data = await this.request("GET", "/cloud/mode");
      console.log("Current RFID mode:", data);
      return data;
    } catch (error) {
      console.error("Failed to get RFID mode:", error);
      return null;
    }
  }

  async setMode(mode: string): Promise<void> {
    try {
      const parseData: unknown = JSON.parse(mode);

      if (typeof parseData === "object" && parseData !== null) {
        await this.request("PUT", "/cloud/mode", parseData);
      }
      console.log("RFID mode updated.");
    } catch (error) {
      console.error("Failed to set RFID mode:", error);
    }
  }
}
