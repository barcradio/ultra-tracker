import { EventEmitter } from "events";
import WebSocket from "ws";
import { DeviceStatus } from "../../shared/enums";

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private eventEmitter: EventEmitter = new EventEmitter();
  private url: string = "";
  private status: DeviceStatus = DeviceStatus.NoDevice;

  constructor(url: string) {
    this.url = url;
    this.status = DeviceStatus.Connecting;
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.ws = new WebSocket(this.url, {
      rejectUnauthorized: false,
    });

    this.ws.on("open", () => {
      this.status = DeviceStatus.Connected;
      this.reconnectAttempts = 0;
      this.eventEmitter.emit("connected");
    });

    this.ws.on("message", (data) => {
      this.eventEmitter.emit("message", data.toString());
    });

    this.ws.on("close", () => {
      console.log("Disconnected from RFID reader");
      if (this.status === DeviceStatus.Disconnecting) {
        this.status = DeviceStatus.Disconnected;
        this.eventEmitter.emit("disconnected");
      } else if (this.status === DeviceStatus.Connected) {
        this.handleReconnection();
      }
    });

    this.ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.eventEmitter.emit("error", error);
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.setupWebSocket();
      }, this.reconnectInterval);
    } else {
      this.status = DeviceStatus.NoDevice;
      this.eventEmitter.emit("status", this.status, "NO RFID Found");
    }
  }

  public connect(addr: string) {
    this.url = "wss://" + addr + "/ws";
    this.handleReconnection();
  }

  public disconnect(): void {
    this.ws?.close(1000, "Client Closing Connection");
    this.status = DeviceStatus.Disconnecting;
  }

  public sendMessage(message: string): void {
    if (this.status === DeviceStatus.Connected) {
      this.ws?.send(message);
    } else {
      this.eventEmitter.emit("error", "RFID not Connected");
    }
  }

  public getStatus(): DeviceStatus {
    return this.status;
  }

  public on(
    event: "connected" | "disconnected" | "error" | "status" | "message",
    listener: (...args: unknown[]) => void
  ): void {
    this.eventEmitter.on(event, listener);
  }
}
