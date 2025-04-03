/*
    Rest Client for the RFID reader. Made to work with the Zebra FXR90
    A raspberry Pi version is in the works 
    
*/
class RestClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private token: string | null = null;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
  }

  // Login method to fetch the token
  async login(): Promise<boolean> {
    const credentials = `${this.username}:${this.password}`;
    const base64Credentials = Buffer.from(credentials).toString("base64");

    try {
      const response = await fetch(`${this.baseUrl}/cloud/localRestLogin`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${base64Credentials}`
        }
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.token = data.message; // Save the token
      console.log("Login successful! Token stored.");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
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

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // API Methods
  async stop(): Promise<void> {
    await this.request("PUT", "/cloud/stop");
    console.log("Stop command sent.");
  }

  async start(): Promise<void> {
    await this.request("PUT", "/cloud/start");
    console.log("Start command sent.");
  }

  async getMode(): Promise<unknown> {
    const data = await this.request("GET", "/cloud/mode");
    console.log("Current mode:", data);
    return data;
  }

  async setMode(): Promise<void> {
    await this.request("PUT", "/cloud/mode", {});
    console.log("Mode updated.");
  }
}
