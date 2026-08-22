import { io, Socket } from "socket.io-client";

let serverSocket: Socket | null = null;

/**
 * Best-effort fire-and-forget emit from a Next.js API route to the
 * Socket.IO realtime gateway running on :3001.
 *
 * This is intentionally non-blocking: if the gateway is down the emit
 * silently fails and the REST response is still returned to the caller.
 */
export function emitToGateway(event: string, payload: unknown): void {
  try {
    if (!serverSocket) {
      const url = process.env.SOCKET_URL ?? "http://localhost:3001";
      serverSocket = io(url, {
        autoConnect: true,
        reconnection: false,        // API routes are short-lived; don't retry
        transports: ["websocket"],
        timeout: 1500,
      });
    }

    if (serverSocket.connected) {
      serverSocket.emit(event, payload);
    } else {
      // Queue the emit for when the socket connects (fires within ~100ms)
      serverSocket.once("connect", () => {
        serverSocket!.emit(event, payload);
      });
      if (serverSocket.disconnected) {
        serverSocket.connect();
      }
    }
  } catch {
    // Gateway unreachable — not critical, dashboard will pick up on next poll
  }
}
