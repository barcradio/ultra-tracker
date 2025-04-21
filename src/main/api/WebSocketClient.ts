import { EventEmitter } from "events";
import WebSocket from "ws";

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private url: string = "";

  constructor(url: string) {
    this.url = url;
    this.ws = new WebSocket(this.url, {
      rejectUnauthorized: false,
    });
    this.connect(this.url);

    this.ws.on("open", () => {
      this.eventEmitter.emit("connected");
    });

    this.ws.on("message", (data) => {
      this.eventEmitter.emit("message", data);
    });

    this.ws.on("close", () => {
      this.eventEmitter.emit("disconnected");
    });

    this.ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.eventEmitter.emit("error", error);
    });
  }

  public connect(addr: string) {
    //this.url = "wss://" + addr + "/ws";
    this.ws = new WebSocket(addr, { rejectUnauthorized: false });
  }

  public disconnect(): void {
    this.ws?.close(1000, "Client Closing Connection");
  }

  public sendMessage(message: string): void {
    this.ws?.send(message);
  }

  public on(
    event: "connected" | "disconnected" | "error" | "status" | "message",
    listener: (...args: unknown[]) => void
  ): void {
    this.eventEmitter.on(event, listener);
  }
}
