import type { Socket } from "socket.io";
import type { SocketData } from "../types/socket.js";
import { verifyToken } from "../lib/auth.js";

export async function authenticateSocket(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void,
): Promise<void> {
  const token = socket.handshake.auth?.token;

  if (typeof token !== "string" || token.length === 0) {
    next(new Error("Authentication required"));
    return;
  }

  try {
    const payload = await verifyToken(token);

    if (!payload) {
      next(new Error("Invalid or expired token"));
      return;
    }

    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error("Authentication failed"));
  }
}